import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { isTerminalTaskStatus, TaskStatus, TaskType } from "./project.enums";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { ProjectAccessService } from "./project-access.service";
import { toTaskResponse } from "./project.mapper";
import { ActivityChange, ActivityService } from "./activity.service";
import { NotificationOutboxService } from "./notification-outbox.service";
import {
  assertTaskEditable,
  assertTaskStatusTransition,
} from "./task-edit.guard";
import {
  isRecordNotFoundError,
  rethrowWriteConflict,
} from "../../common/prisma/prisma-errors";
import { paginate, PaginationQueryDto } from "../../common/pagination";
import { TaskCalendarEventService } from "./task-calendar-event.service";
import { taskInclude } from "./task-query";
import { lockProject } from "./project-transaction";
import { normalizeTaskRank } from "./task-rank";

const taskWithCount = taskInclude;

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly activities: ActivityService,
    private readonly notifications: NotificationOutboxService,
    private readonly calendarEvents: TaskCalendarEventService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateTaskDto) {
    await this.access.requireCanCreateTask(userId, projectId);
    const startDate = this.toDate(dto.startDate);
    const dueDate = this.toDate(dto.dueDate);
    this.validateDateRange(startDate, dueDate);
    if (dto.sprintId) await this.access.requireCanManageSprints(userId, projectId);
    if (!dto.parentTaskId && dto.taskType === TaskType.SUBTASK) {
      throw new ConflictException("A subtask must have a parent task");
    }

    const now = new Date();
    const status = dto.status ?? TaskStatus.TODO;
    const task = await this.prisma.$transaction(async (tx) => {
      const projectSequence = await tx.project.update({
        where: { id: projectId },
        data: { nextTaskNumber: { increment: 1 } },
        select: { nextTaskNumber: true },
      });
      const parentSprintId = await this.validateParent(projectId, dto.parentTaskId, undefined, tx);
      if (dto.parentTaskId && dto.sprintId && parentSprintId !== dto.sprintId) {
        throw new ConflictException("A subtask must belong to its parent's sprint");
      }
      const sprintId = dto.sprintId ?? parentSprintId;
      if (sprintId) {
        const sprint = await tx.sprint.findFirst({ where: { id: sprintId, projectId } });
        if (!sprint || sprint.status !== "PLANNED") {
          throw new ConflictException("Tasks can only be added to a planned sprint");
        }
      }
      const created = await tx.task.create({
        data: {
          id: crypto.randomUUID(),
          projectId,
          parentTaskId: dto.parentTaskId,
          taskNumber: projectSequence.nextTaskNumber - 1,
          taskType: dto.parentTaskId
            ? TaskType.SUBTASK
            : dto.isParentTask
              ? TaskType.EPIC
              : (dto.taskType ?? TaskType.TASK),
          ...(sprintId !== undefined ? { sprintId } : {}),
          title: dto.title.trim(),
          description: dto.description,
          priority: dto.priority ?? "MEDIUM",
          status,
          createdBy: userId,
          reporterId: userId,
          startDate,
          dueDate,
          allDay: dto.allDay ?? false,
          completedAt: isTerminalTaskStatus(status) ? now : undefined,
          completedBy: isTerminalTaskStatus(status) ? userId : undefined,
          estimatedMinutes: dto.estimatedMinutes ?? 0,
          rank: normalizeTaskRank(dto.rank),
          archived: false,
          isParentTask: dto.isParentTask ?? false,
          autoCompleteSprint: dto.autoCompleteSprint ?? false,
          createdAt: now,
          updatedAt: now,
        },
        include: taskWithCount,
      });
      await this.activities.record(
        created.id,
        userId,
        "created",
        null,
        created.title,
        tx,
      );
      await this.calendarEvents.publishUpsert(created.id, tx);
      return created;
    });

    return toTaskResponse(task);
  }

  async findAll(userId: string, projectId: string, query: PaginationQueryDto) {
    await this.access.requireReadAccess(userId, projectId);
    const where: Prisma.TaskWhereInput = {
      projectId,
      archived: false,
      deletedAt: null,
    };
    const [total, tasks] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
        include: taskWithCount,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return paginate(tasks.map(toTaskResponse), total, query);
  }

  async findOne(userId: string, taskId: string) {
    const task = await this.findTask(taskId);
    await this.access.requireReadAccess(userId, task.projectId);
    return toTaskResponse(task);
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const current = await this.findTask(taskId);
    await this.access.requireCanEditTask(
      userId,
      current.projectId,
      current.createdBy,
    );
    assertTaskEditable(current.status);

    if (dto.title !== undefined && !dto.title.trim()) {
      throw new BadRequestException("Task title cannot be empty");
    }
    if (dto.clearParent && dto.parentTaskId) {
      throw new ConflictException(
        "A task cannot be assigned and unassigned at the same time",
      );
    }
    const effectiveParentTaskId = dto.clearParent
      ? null
      : (dto.parentTaskId ?? current.parentTaskId);
    if (!effectiveParentTaskId && dto.taskType === TaskType.SUBTASK) {
      throw new ConflictException("A subtask must have a parent task");
    }
    if (dto.status !== undefined) {
      assertTaskStatusTransition(current.status, dto.status);
    }

    if (dto.assigneeUserId) {
      await this.requireActiveMember(current.projectId, dto.assigneeUserId);
    }

    const startDate =
      dto.startDate !== undefined
        ? this.toDate(dto.startDate)
        : current.startDate;
    const dueDate =
      dto.dueDate !== undefined ? this.toDate(dto.dueDate) : current.dueDate;
    this.validateDateRange(startDate, dueDate);

    let parentTaskId: string | null | undefined;
    if (dto.clearParent) {
      parentTaskId = null;
    } else if (dto.parentTaskId !== undefined) {
      parentTaskId = dto.parentTaskId;
    }

    const data: Prisma.TaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.startDate !== undefined) data.startDate = startDate;
    if (dto.dueDate !== undefined) data.dueDate = dueDate;
    if (dto.allDay !== undefined) data.allDay = dto.allDay;
    if (dto.estimatedMinutes !== undefined)
      data.estimatedMinutes = dto.estimatedMinutes;
    if (dto.rank !== undefined) data.rank = normalizeTaskRank(dto.rank);
    if (dto.archived !== undefined) data.archived = dto.archived;
    if (dto.isParentTask !== undefined) data.isParentTask = dto.isParentTask;
    if (parentTaskId !== undefined) {
      data.taskType =
        parentTaskId === null
          ? (dto.taskType ?? TaskType.TASK)
          : TaskType.SUBTASK;
    } else if (current.parentTaskId && dto.taskType !== undefined) {
      data.taskType = TaskType.SUBTASK;
    } else if (dto.isParentTask === true) {
      data.taskType = TaskType.EPIC;
    } else if (
      dto.isParentTask === false &&
      current.taskType === TaskType.EPIC
    ) {
      data.taskType = dto.taskType ?? TaskType.TASK;
    } else if (dto.taskType !== undefined) {
      data.taskType = dto.taskType;
    }
    if (dto.autoCompleteSprint !== undefined)
      data.autoCompleteSprint = dto.autoCompleteSprint;
    if (parentTaskId !== undefined) {
      data.parent =
        parentTaskId === null
          ? { disconnect: true }
          : { connect: { id: parentTaskId } };
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      data.completedAt = isTerminalTaskStatus(dto.status) ? new Date() : null;
      data.completedBy = isTerminalTaskStatus(dto.status) ? userId : null;
    }

    let task: Prisma.TaskGetPayload<{ include: typeof taskWithCount }>;
    try {
      task = await this.prisma.$transaction(async (tx) => {
        await lockProject(tx, current.projectId);
        if (dto.parentTaskId !== undefined) {
          const sprintId = await this.validateParent(current.projectId, dto.parentTaskId, current.id, tx);
          if (current.sprintId !== sprintId) {
            const affected = await tx.sprint.findMany({ where: { id: { in: [current.sprintId, sprintId].filter((id): id is string => Boolean(id)) } } });
            if (affected.some((sprint) => sprint.status !== "PLANNED")) {
              throw new ConflictException("Only planned sprint tasks can be reparented across sprints");
            }
          }
          data.sprint = sprintId ? { connect: { id: sprintId } } : { disconnect: true };
          data.isParentTask = false;
        }
        const updated = await tx.task.update({
          where: { id: taskId, version: current.version },
          data: { ...data, version: { increment: 1 } },
          include: taskWithCount,
        });
        if (dto.assigneeUserId !== undefined) {
          await tx.taskAssignee.deleteMany({ where: { taskId } });
          if (dto.assigneeUserId !== null) {
            await tx.taskAssignee.create({
              data: {
                id: crypto.randomUUID(),
                taskId,
                projectId: current.projectId,
                userId: dto.assigneeUserId,
                assignedAt: new Date(),
              },
            });
          }
        }
        await this.recordChanges(current, updated, dto, userId, tx);
        if (dto.assigneeUserId !== undefined && dto.assigneeUserId !== null) {
          await this.notifications.enqueueNotification(
            {
              recipientId: dto.assigneeUserId,
              senderId: userId,
              type: "PROJECT_TASK_ASSIGNED",
              title: "You were assigned a task",
              content: `Task "${updated.title}" was assigned to you.`,
              link: `/projects/${current.projectId}`,
              metadata: { taskId: current.id, projectId: current.projectId },
            },
            tx,
          );
        } else if (
          dto.status !== undefined ||
          dto.title !== undefined ||
          dto.dueDate !== undefined
        ) {
          for (const assignee of current.assignees) {
            if (assignee.userId === userId) continue;
            await this.notifications.enqueueNotification(
              {
                recipientId: assignee.userId,
                senderId: userId,
                type: "PROJECT_TASK_UPDATED",
                title: "Task updated",
                content: `Task "${updated.title}" was just updated.`,
                link: `/projects/${current.projectId}`,
                metadata: { taskId: current.id, projectId: current.projectId },
              },
              tx,
            );
          }
        }
        await this.calendarEvents.publishUpsert(updated.id, tx);
        if (dto.assigneeUserId === undefined) return updated;
        return tx.task.findUniqueOrThrow({
          where: { id: taskId },
          include: taskWithCount,
        });
      });
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new ConflictException("Task was changed by another request");
      }
      throw error;
    }
    return toTaskResponse(task);
  }

  async delete(userId: string, taskId: string): Promise<void> {
    const task = await this.findTask(taskId);
    await this.access.requireCanEditTask(
      userId,
      task.projectId,
      task.createdBy,
    );
    assertTaskEditable(task.status);
    try {
      await this.prisma.$transaction(async (tx) => {
        await lockProject(tx, task.projectId);
        const children = await tx.task.findMany({ where: { parentTaskId: task.id, deletedAt: null }, select: { id: true, status: true } });
        children.forEach((child) => assertTaskEditable(child.status));
        await tx.task.updateMany({ where: { id: { in: children.map((child) => child.id) } }, data: { parentTaskId: null, taskType: TaskType.TASK, version: { increment: 1 } } });
        await tx.task.update({
          where: { id: taskId, version: task.version },
          data: {
            archived: true,
            deletedAt: new Date(),
            version: { increment: 1 },
          },
        });
        await this.activities.record(
          taskId,
          userId,
          "archived",
          false,
          true,
          tx,
        );
        await this.calendarEvents.publishUpsert(taskId, tx);
      });
    } catch (error) {
      rethrowWriteConflict(error, "Task was changed by another request");
    }
  }

  private async findTask(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: taskWithCount,
    });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  private async validateParent(
    projectId: string,
    parentTaskId?: string,
    currentTaskId?: string,
    database: Prisma.TransactionClient = this.prisma,
  ): Promise<string | null | undefined> {
    if (!parentTaskId) return undefined;
    if (parentTaskId === currentTaskId)
      throw new ConflictException("A task cannot be its own parent");

    const parent = await database.task.findFirst({
      where: { id: parentTaskId, projectId, deletedAt: null },
      select: {
        archived: true,
        parentTaskId: true,
        sprintId: true,
        status: true,
      },
    });
    if (!parent)
      throw new NotFoundException("Parent task not found in this project");
    if (parent.archived)
      throw new ConflictException("An archived task cannot be a parent");
    assertTaskEditable(parent.status);
    if (parent.parentTaskId)
      throw new ConflictException("Only top-level tasks can be parents");
    if (currentTaskId && await database.task.count({ where: { parentTaskId: currentTaskId, deletedAt: null } })) {
      throw new ConflictException("A task with children cannot become a subtask");
    }
    return parent.sprintId;
  }

  private async requireActiveMember(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { status: true },
    });
    if (!member || member.status !== "ACTIVE") {
      throw new BadRequestException(
        "Assignee must be an active project member",
      );
    }
  }

  private toDate(value?: string | null): Date | null | undefined {
    if (value && value.includes('T') && !/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
      throw new BadRequestException('Task timestamps must include a timezone offset');
    }
    return value == null ? value : new Date(value);
  }

  private validateDateRange(
    startDate?: Date | null,
    dueDate?: Date | null,
  ): void {
    if (startDate && dueDate && startDate > dueDate) {
      throw new ConflictException("Start date cannot be after due date");
    }
  }

  private async recordChanges(
    current: Prisma.TaskGetPayload<{ include: typeof taskWithCount }>,
    updated: Prisma.TaskGetPayload<{ include: typeof taskWithCount }>,
    dto: UpdateTaskDto,
    actorId: string,
    database: Prisma.TransactionClient,
  ) {
    const changes: ActivityChange[] = [];
    if (dto.title !== undefined)
      changes.push(["title", current.title, updated.title]);
    if (dto.description !== undefined)
      changes.push(["description", current.description, updated.description]);
    if (dto.priority !== undefined)
      changes.push(["priority", current.priority, updated.priority]);
    if (
      dto.taskType !== undefined ||
      dto.parentTaskId !== undefined ||
      dto.clearParent
    ) {
      changes.push(["taskType", current.taskType, updated.taskType]);
    }
    if (dto.status !== undefined)
      changes.push(["status", current.status, updated.status]);
    if (dto.startDate !== undefined)
      changes.push([
        "startDate",
        current.startDate?.toISOString(),
        updated.startDate?.toISOString(),
      ]);
    if (dto.dueDate !== undefined)
      changes.push([
        "dueDate",
        current.dueDate?.toISOString(),
        updated.dueDate?.toISOString(),
      ]);
    if (dto.estimatedMinutes !== undefined)
      changes.push([
        "estimatedMinutes",
        current.estimatedMinutes,
        updated.estimatedMinutes,
      ]);
    if (dto.allDay !== undefined)
      changes.push(["allDay", current.allDay, updated.allDay]);
    if (dto.rank !== undefined)
      changes.push(["rank", current.rank, updated.rank]);
    if (dto.archived !== undefined)
      changes.push(["archived", current.archived, updated.archived]);
    if (dto.parentTaskId !== undefined || dto.clearParent)
      changes.push([
        "parentTaskId",
        current.parentTaskId,
        updated.parentTaskId,
      ]);
    if (dto.isParentTask !== undefined)
      changes.push([
        "isParentTask",
        current.isParentTask,
        updated.isParentTask,
      ]);
    if (dto.autoCompleteSprint !== undefined)
      changes.push([
        "autoCompleteSprint",
        current.autoCompleteSprint,
        updated.autoCompleteSprint,
      ]);
    if (dto.assigneeUserId !== undefined)
      changes.push([
        "assigneeUserId",
        current.assignees[0]?.userId,
        dto.assigneeUserId,
      ]);
    await this.activities.recordMany(current.id, actorId, changes, database);
  }
}
