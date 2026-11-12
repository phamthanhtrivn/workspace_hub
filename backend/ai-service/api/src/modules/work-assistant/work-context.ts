import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { z } from "zod";
import type { Actor } from "../../common/types";
import type { Metrics, WorkContext, WorkScope } from "./work-assistant.types";
import { workContextRequest } from "../../infrastructure/integrations/work-context.client";
import { projectSchema, calendarSchema } from "./work-context.schemas";
import { rankTasks } from "./work-task-ranking";
import { freeSlots, workRange } from "./work-time";

@Injectable()
export class WorkContextService {
  async authorize(actor: Actor, projectIds: string[], signal?: AbortSignal) {
    if (!projectIds.length) return new Set<string>();
    const ids = [...new Set(projectIds)];
    if (ids.length > 1000)
      throw new ServiceUnavailableException("Quá nhiều dự án trong lịch sử.");
    const data = z
      .object({ projectIds: z.array(z.string().uuid()).max(1000) })
      .parse(
        await workContextRequest(
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
    const includeProject = scope.audience !== "calendar";
    const includeCalendarContext =
      !scope.projectId &&
      (scope.audience === "mine" || scope.audience === "calendar");
    const projectRead = async () =>
      projectSchema.parse(
        await workContextRequest(
          "project",
          "context",
          {
            userId: actor.id,
            ...(scope.projectId ? { projectId: scope.projectId } : {}),
            audience: "mine",
            from: range.from,
            to: range.to,
            now: now.toISOString(),
            timeZone,
          },
          signal,
        ),
      );
    const calendarRead = async () =>
      calendarSchema.parse(
        await workContextRequest(
          "calendar",
          "context",
          {
            userId: actor.id,
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
      includeProject ? projectRead() : Promise.resolve(null),
      includeCalendarContext ? calendarRead() : Promise.resolve(null),
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
          includeProject ? projectRead() : Promise.resolve(null),
          includeCalendarContext ? calendarRead() : Promise.resolve(null),
        ]);
        if (
          updated[0].status === "rejected" &&
          updated[0].reason instanceof ForbiddenException
        )
          throw updated[0].reason;
        project = updated[0].status === "fulfilled" ? updated[0].value : null;
        calendar = updated[1].status === "fulfilled" ? updated[1].value : null;
      } catch (error) {
        if (error instanceof ForbiddenException) throw error;
        project = null;
        calendar = null;
      }
    }
    // Personal Calendar tasks are separate from project tasks, never copies of synced tasks.
    const tasks = rankTasks([
      ...(includeProject ? (project?.tasks ?? []) : []),
      ...(includeCalendarContext ? (calendar?.tasks ?? []) : []),
    ]);

    return {
      scope,
      fetchedAt: now.toISOString(),
      date: range.today,
      timeZone,
      days,
      period: { from: range.from, to: range.to },
      projectIds: includeProject
        ? (project?.projectIds ?? (scope.projectId ? [scope.projectId] : []))
        : [],
      sources: {
        project: {
          state: !includeProject
            ? "empty"
            : !project
              ? "unavailable"
              : project.partial
                ? "partial"
                : project.metrics.open || project.metrics.completedInPeriod
                  ? "ready"
                  : "empty",
        },
        calendar: {
          state: !includeCalendarContext
            ? "empty"
            : !calendar
              ? "unavailable"
              : calendar.partial || calendar.busyPartial
                ? "partial"
                : calendar.tasks.length ||
                    calendar.metrics.completedInPeriod ||
                    calendar.busy.length ||
                    calendar.focus.sessions
                  ? "ready"
                  : "empty",
        },
      },
      metrics: {
        project: includeProject
          ? ((project?.metrics as Metrics) ?? null)
          : null,
        personal: includeCalendarContext ? (calendar?.metrics ?? null) : null,
        focusSeconds: includeCalendarContext
          ? (calendar?.focus.seconds ?? null)
          : null,
        focusSessions: includeCalendarContext
          ? (calendar?.focus.sessions ?? null)
          : null,
      },
      tasks: tasks.slice(0, 60),
      detailPartial: !!(
        (includeProject && project?.partial) ||
        (includeCalendarContext && calendar?.partial) ||
        tasks.length > 60
      ),
      busyPartial:
        includeCalendarContext && (!calendar || calendar.busyPartial),
      focusPerTask: includeCalendarContext
        ? (calendar?.focus.perTask ?? [])
        : [],
      schedulingBasis: "calendar",
      freeSlots: includeCalendarContext
        ? freeSlots(
            now,
            timeZone,
            calendar?.busy ?? [],
            !calendar || calendar.busyPartial,
          )
        : [],
      busy: includeCalendarContext ? (calendar?.busy ?? []) : [],
    };
  }
}
