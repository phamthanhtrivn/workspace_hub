import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

export type ConversationTaskScope = "today" | "overdue" | "open";
export const TASK_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function taskDay(now: Date) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: TASK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const start = new Date(`${date}T00:00:00+07:00`);
  return { date, start, end: new Date(start.getTime() + 86400000) };
}

export function conversationTaskWhere(
  userId: string,
  scope: ConversationTaskScope,
  now: Date,
  projectId?: string,
): Prisma.TaskWhereInput {
  const day = taskDay(now);
  const overdue: Prisma.TaskWhereInput = {
    OR: [
      { allDay: true, dueDate: { lt: day.start } },
      { allDay: false, dueDate: { lt: now } },
    ],
  };
  const dateFilter: Prisma.TaskWhereInput =
    scope === "overdue"
      ? overdue
      : scope === "today"
        ? {
            OR: [
              { dueDate: { lt: day.end } },
              {
                startDate: { lt: day.end },
                OR: [{ dueDate: null }, { dueDate: { gte: day.start } }],
              },
            ],
          }
        : {};
  return {
    ...(projectId ? { projectId } : {}),
    archived: false,
    deletedAt: null,
    status: { notIn: ["DONE", "CANCELLED"] },
    assignees: { some: { userId } },
    project: {
      archived: false,
      status: { not: "ARCHIVED" },
      OR: [
        { ownerId: userId },
        { members: { some: { userId, status: "ACTIVE" } } },
      ],
    },
    ...dateFilter,
  };
}

@Injectable()
export class ConversationTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, scope: ConversationTaskScope, projectId?: string) {
    const now = new Date();
    const day = taskDay(now);
    const rows = await this.prisma.task.findMany({
      where: conversationTaskWhere(userId, scope, now, projectId),
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { id: "asc" }],
      take: 31,
      select: {
        id: true,
        title: true,
        taskNumber: true,
        projectId: true,
        status: true,
        priority: true,
        startDate: true,
        dueDate: true,
        allDay: true,
        project: { select: { name: true } },
      },
    });
    return {
      available: true,
      source: "project-service",
      scope,
      date: day.date,
      timeZone: TASK_TIME_ZONE,
      projectId: projectId ?? null,
      hasMore: rows.length > 30,
      tasks: rows.slice(0, 30).map((task) => ({
        id: task.id,
        title: task.title,
        number: task.taskNumber,
        project: task.project.name,
        projectId: task.projectId,
        status: task.status,
        priority: task.priority,
        startDate: task.startDate,
        dueDate: task.dueDate,
        allDay: task.allDay,
        timing:
          task.dueDate && task.dueDate < (task.allDay ? day.start : now)
            ? "OVERDUE"
            : task.dueDate &&
                task.dueDate >= day.start &&
                task.dueDate < day.end
              ? "DUE_TODAY"
              : task.startDate && task.startDate < day.end
                ? "ONGOING"
                : "OPEN",
        url: `/projects/${task.projectId}?taskId=${task.id}`,
      })),
    };
  }
}
