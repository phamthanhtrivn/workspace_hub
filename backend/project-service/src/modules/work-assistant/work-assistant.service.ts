import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { WorkContextDto } from "./work-assistant.controller";

const active = { archived: false, deletedAt: null };
function localDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
@Injectable()
export class WorkAssistantService {
  constructor(private readonly prisma: PrismaService) {}
  private access(userId: string): Prisma.ProjectWhereInput {
    return {
      OR: [
        { ownerId: userId },
        { members: { some: { userId, status: "ACTIVE" } } },
      ],
    };
  }
  async authorize(userId: string, projectIds: string[]) {
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds }, ...this.access(userId) },
      select: { id: true },
    });
    return { projectIds: projects.map((p) => p.id) };
  }
  async context(input: WorkContextDto) {
    const now = new Date(input.now),
      from = new Date(input.from),
      to = new Date(input.to);
    try {
      localDate(now, input.timeZone);
    } catch {
      throw new BadRequestException("Invalid time zone");
    }
    if (
      !(to > from) ||
      to.getTime() - from.getTime() > 32 * 86400000 ||
      Math.abs(Date.now() - now.getTime()) > 300000
    )
      throw new BadRequestException("Invalid period");
    if (input.projectId) {
      const allowed = await this.authorize(input.userId, [input.projectId]);
      if (!allowed.projectIds.length)
        throw new ForbiddenException("Project access revoked");
    }
    const projectWhere: Prisma.ProjectWhereInput = {
      ...this.access(input.userId),
      ...(input.projectId ? { id: input.projectId } : {}),
      archived: false,
      status: { not: "ARCHIVED" },
    };
    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      select: { id: true },
    });
    const where: Prisma.TaskWhereInput = {
      ...active,
      project: projectWhere,
      ...(input.audience === "mine"
        ? { assignees: { some: { userId: input.userId } } }
        : {}),
    };
    const openWhere: Prisma.TaskWhereInput = {
      ...where,
      status: { notIn: ["DONE", "CANCELLED"] },
    };
    // Aggregate over the full authorized set; only model detail rows are capped.
    const [counts, deadlines, completed, tasks] = await Promise.all([
      this.prisma.task.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      this.prisma.task.findMany({
        where: { ...openWhere, dueDate: { not: null } },
        select: { dueDate: true, allDay: true },
      }),
      this.prisma.task.findMany({
        where: { ...where, status: "DONE", completedAt: { gte: from, lt: to } },
        select: { dueDate: true, completedAt: true, allDay: true },
      }),
      this.prisma.task.findMany({
        where: openWhere,
        take: 61,
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { id: "asc" }],
        select: {
          id: true,
          projectId: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          startDate: true,
          dueDate: true,
          allDay: true,
          parentTaskId: true,
          project: { select: { name: true } },
          checklists: {
            take: 8,
            orderBy: { rank: "asc" },
            select: { title: true, completed: true },
          },
          _count: {
            select: {
              children: { where: active },
              checklists: true,
              dependenciesFrom: {
                where: {
                  successor: {
                    ...active,
                    status: { notIn: ["DONE", "CANCELLED"] },
                  },
                },
              },
            },
          },
          dependenciesTo: {
            select: {
              predecessor: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  archived: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      }),
    ]);
    const today = localDate(now, input.timeZone);
    const isOverdue = (task: { dueDate: Date | null; allDay: boolean }) =>
      !!task.dueDate &&
      (task.allDay
        ? localDate(task.dueDate, input.timeZone) < today
        : task.dueDate < now);
    const dueCompleted = completed.filter((t) => t.dueDate);
    const onTime = dueCompleted.filter(
      (t) =>
        t.completedAt &&
        t.dueDate &&
        (t.allDay
          ? localDate(t.completedAt, input.timeZone) <=
            localDate(t.dueDate, input.timeZone)
          : t.completedAt <= t.dueDate),
    ).length;
    const byStatus = Object.fromEntries(
      counts.map((c) => [c.status, c._count._all]),
    );
    const open = counts
      .filter((c) => !["DONE", "CANCELLED"].includes(c.status))
      .reduce((n, c) => n + c._count._all, 0);
    return {
      available: true,
      projectIds: projects.map((p) => p.id),
      partial: tasks.length > 60,
      metrics: {
        total: counts.reduce((n, c) => n + c._count._all, 0),
        open,
        byStatus,
        overdue: deadlines.filter(isOverdue).length,
        dueToday: deadlines.filter(
          (t) => t.dueDate && localDate(t.dueDate, input.timeZone) === today,
        ).length,
        completedInPeriod: completed.length,
        completedWithDeadline: dueCompleted.length,
        onTime,
        late: dueCompleted.length - onTime,
        onTimeRate: dueCompleted.length ? onTime / dueCompleted.length : null,
        deadlineBasis: "current stored deadline",
      },
      tasks: tasks.slice(0, 60).map((task) => ({
        id: task.id,
        kind: "project",
        projectId: task.projectId,
        project: task.project.name,
        title: task.title.slice(0, 200),
        description: task.description?.slice(0, 800) ?? null,
        status: task.status,
        priority: task.priority,
        startAt: task.startDate,
        dueAt: task.dueDate,
        allDay: task.allDay,
        overdue: isOverdue(task),
        dueToday:
          !!task.dueDate && localDate(task.dueDate, input.timeZone) === today,
        checklist: task.checklists.map((c) => ({
          title: c.title.slice(0, 160),
          completed: c.completed,
        })),
        checklistCount: task._count.checklists,
        childCount: task._count.children,
        unblocks: task._count.dependenciesFrom,
        blockedBy: task.dependenciesTo
          .filter(
            (d) =>
              !d.predecessor.archived &&
              !d.predecessor.deletedAt &&
              !["DONE", "CANCELLED"].includes(d.predecessor.status),
          )
          .slice(0, 8)
          .map((d) => ({
            id: d.predecessor.id,
            title: d.predecessor.title.slice(0, 160),
          })),
        url: "/projects/" + task.projectId + "?taskId=" + task.id,
      })),
    };
  }
}
