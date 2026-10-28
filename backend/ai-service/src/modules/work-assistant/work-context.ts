import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { z } from "zod";
import { config } from "../../config/env.config";
import type { Actor } from "../../common/types";
import type {
  Metrics,
  WorkContext,
  WorkScope,
  WorkTask,
} from "./work-assistant.types";
import { freeSlots, workRange } from "./work-time";

const metricsSchema = z.object({
  open: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  dueToday: z.number().int().nonnegative(),
  completedInPeriod: z.number().int().nonnegative(),
  completedWithDeadline: z.number().int().nonnegative(),
  onTime: z.number().int().nonnegative(),
  late: z.number().int().nonnegative(),
  onTimeRate: z.number().min(0).max(1).nullable(),
  deadlineBasis: z.string(),
  total: z.number().optional(),
  byStatus: z.record(z.string(), z.number()).optional(),
});
const taskSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["project", "calendar"]),
  projectId: z.string().uuid().optional(),
  project: z.string().max(200).optional(),
  title: z.string().max(200),
  description: z.string().max(800).nullable().optional(),
  priority: z.string(),
  status: z.string(),
  startAt: z.string().nullable().optional(),
  dueAt: z.string().nullable(),
  allDay: z.boolean(),
  overdue: z.boolean(),
  dueToday: z.boolean(),
  url: z.string().max(500),
  checklist: z
    .array(z.object({ title: z.string(), completed: z.boolean() }))
    .max(8),
  checklistCount: z.number(),
  childCount: z.number(),
  blockedBy: z
    .array(z.object({ id: z.string().uuid(), title: z.string() }))
    .max(8),
  unblocks: z.number(),
});
const projectSchema = z.object({
  available: z.literal(true),
  projectIds: z.array(z.string().uuid()).max(1000),
  partial: z.boolean(),
  tasks: z.array(taskSchema).max(60),
  metrics: metricsSchema,
});
const calendarSchema = z.object({
  available: z.literal(true),
  timeZone: z.string(),
  partial: z.boolean(),
  busyPartial: z.boolean(),
  busy: z
    .array(
      z
        .object({
          startAt: z.string().datetime({ offset: true }),
          endAt: z.string().datetime({ offset: true }),
        })
        .refine(
          (interval) =>
            Date.parse(interval.endAt) > Date.parse(interval.startAt),
          "Invalid busy interval",
        ),
    )
    .max(2000),
  tasks: z.array(taskSchema).max(60),
  metrics: metricsSchema,
  focus: z.object({
    seconds: z.number().nonnegative(),
    sessions: z.number().nonnegative(),
    perTask: z
      .array(
        z.object({
          taskId: z.string().uuid().nullable(),
          eventId: z.string().uuid().nullable(),
          seconds: z.number(),
          sessions: z.number(),
        }),
      )
      .max(60),
  }),
});
export function rankTasks(tasks: WorkTask[]) {
  const priority: Record<string, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  return [...tasks].sort(
    (a, b) =>
      Number(b.overdue) - Number(a.overdue) ||
      Number(b.dueToday) - Number(a.dueToday) ||
      Number(!!a.blockedBy.length) - Number(!!b.blockedBy.length) ||
      (priority[b.priority] ?? 0) - (priority[a.priority] ?? 0) ||
      (Date.parse(a.dueAt ?? "") || Infinity) -
        (Date.parse(b.dueAt ?? "") || Infinity) ||
      b.unblocks - a.unblocks ||
      a.id.localeCompare(b.id),
  );
}
@Injectable()
export class WorkContextService {
  private async call(
    service: "project" | "calendar",
    path: string,
    body: object,
    signal?: AbortSignal,
  ) {
    if (config.WORK_ASSISTANT_SERVICE_KEY.length < 32)
      throw new ServiceUnavailableException(
        "Trợ lý công việc chưa được cấu hình.",
      );
    const base =
      service === "project"
        ? config.WORK_ASSISTANT_PROJECT_URL
        : config.WORK_ASSISTANT_CALENDAR_URL;
    const response = await fetch(
      base.replace(/\/$/, "") + "/internal/work-assistant/" + path,
      {
        method: "POST",
        redirect: "error",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
          : AbortSignal.timeout(10000),
        headers: {
          "content-type": "application/json",
          "x-internal-service-key": config.WORK_ASSISTANT_SERVICE_KEY,
        },
        body: JSON.stringify(body),
      },
    );
    if (response.status === 403 || response.status === 404) {
      await response.body?.cancel();
      throw new ForbiddenException("Bạn không còn quyền xem dự án này.");
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new ServiceUnavailableException(
        "Nguồn dữ liệu chưa truy cập được.",
      );
    }
    const text = await response.text();
    if (text.length > 350000)
      throw new ServiceUnavailableException("Nguồn dữ liệu vượt giới hạn.");
    return (JSON.parse(text) as { data: unknown }).data;
  }
  async authorize(actor: Actor, projectIds: string[], signal?: AbortSignal) {
    if (!projectIds.length) return new Set<string>();
    const ids = [...new Set(projectIds)];
    if (ids.length > 1000)
      throw new ServiceUnavailableException("Quá nhiều dự án trong lịch sử.");
    const data = z
      .object({ projectIds: z.array(z.string().uuid()).max(1000) })
      .parse(
        await this.call(
          "project",
          "authorize",
          { userId: actor.id, projectIds: ids },
          signal,
        ),
      );
    return new Set(data.projectIds);
  }
  async requireScope(actor: Actor, scope: WorkScope, signal?: AbortSignal) {
    if (
      scope.projectId &&
      !(await this.authorize(actor, [scope.projectId], signal)).has(
        scope.projectId,
      )
    )
      throw new ForbiddenException("Bạn không còn quyền xem dự án này.");
  }
  async read(
    actor: Actor,
    scope: WorkScope,
    days: 7 | 30 = 7,
    signal?: AbortSignal,
    fallbackTimeZone?: string,
  ): Promise<WorkContext> {
    await this.requireScope(actor, scope, signal);
    const now = new Date();
    let timeZone = fallbackTimeZone ?? "Asia/Ho_Chi_Minh";
    let range = workRange(now, timeZone, days);
    const calendarRead = async () =>
      calendarSchema.parse(
        await this.call(
          "calendar",
          "context",
          {
            userId: actor.id,
            ...(scope.projectId ? { projectId: scope.projectId } : {}),
            from: range.from,
            to: range.to,
            windowStart: range.windowStart,
            windowEnd: range.windowEnd,
            todayEnd: range.to,
          },
          signal,
        ),
      );
    const outcomes = await Promise.allSettled([
      this.call(
        "project",
        "context",
        {
          userId: actor.id,
          ...scope,
          from: range.from,
          to: range.to,
          now: now.toISOString(),
          timeZone,
        },
        signal,
      ).then((d) => projectSchema.parse(d)),
      calendarRead(),
    ]);
    if (signal?.aborted) signal.throwIfAborted();
    if (
      outcomes[0].status === "rejected" &&
      outcomes[0].reason instanceof ForbiddenException
    )
      throw outcomes[0].reason;
    let project = outcomes[0].status === "fulfilled" ? outcomes[0].value : null;
    let calendar =
      outcomes[1].status === "fulfilled" ? outcomes[1].value : null;
    if (!fallbackTimeZone && calendar && calendar.timeZone !== timeZone) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: calendar.timeZone }).format();
        timeZone = calendar.timeZone;
        range = workRange(now, timeZone, days);
        const updated = await Promise.allSettled([
          this.call(
            "project",
            "context",
            {
              userId: actor.id,
              ...scope,
              from: range.from,
              to: range.to,
              now: now.toISOString(),
              timeZone,
            },
            signal,
          ).then((d) => projectSchema.parse(d)),
          calendarRead(),
        ]);
        project = updated[0].status === "fulfilled" ? updated[0].value : null;
        calendar = updated[1].status === "fulfilled" ? updated[1].value : null;
      } catch {
        project = null;
        calendar = null;
      }
    }
    // Personal Calendar tasks are separate from project tasks, never copies of synced tasks.
    const tasks = rankTasks([
      ...(project?.tasks ?? []),
      ...(!scope.projectId ? (calendar?.tasks ?? []) : []),
    ]);
    return {
      scope,
      fetchedAt: now.toISOString(),
      date: range.today,
      timeZone,
      days,
      period: { from: range.from, to: range.to },
      projectIds:
        project?.projectIds ?? (scope.projectId ? [scope.projectId] : []),
      sources: {
        project: {
          state: !project
            ? "unavailable"
            : project.partial
              ? "partial"
              : project.metrics.open || project.metrics.completedInPeriod
                ? "ready"
                : "empty",
        },
        calendar: {
          state: !calendar
            ? "unavailable"
            : calendar.partial || calendar.busyPartial
              ? "partial"
              : calendar.tasks.length ||
                  calendar.busy.length ||
                  calendar.focus.sessions ||
                  calendar.metrics.completedInPeriod
                ? "ready"
                : "empty",
        },
      },
      metrics: {
        project: (project?.metrics as Metrics) ?? null,
        personal: !scope.projectId ? (calendar?.metrics ?? null) : null,
        focusSeconds: calendar?.focus.seconds ?? null,
        focusSessions: calendar?.focus.sessions ?? null,
      },
      tasks: tasks.slice(0, 60),
      detailPartial: !!(
        project?.partial ||
        calendar?.partial ||
        tasks.length > 60
      ),
      busyPartial: !calendar || calendar.busyPartial,
      focusPerTask: calendar?.focus.perTask ?? [],
      schedulingBasis: "calendar",
      freeSlots: freeSlots(
        now,
        timeZone,
        calendar?.busy ?? [],
        !calendar || calendar.busyPartial,
      ),
      busy: calendar?.busy ?? [],
    };
  }
}
