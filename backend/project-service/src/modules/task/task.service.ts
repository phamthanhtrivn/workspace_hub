import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { isTerminalTaskStatus, TaskStatus } from "../project/project.enums";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { ProjectAccessService } from "../project/project-access.service";
import { toTaskResponse } from "../project/project.mapper";
import { ActivityChange, ActivityService } from "../activity/activity.service";
import { NotificationOutboxService } from "../notification-outbox/notification-outbox.service";
import {
  assertTaskEditable,
  assertTaskStatusTransition,
} from "./task-edit.guard";
import {
  isRecordNotFoundError,
  rethrowWriteConflict,
} from "../../common/prisma/prisma-errors";
import { paginate } from "../../common/utils/pagination";
import { GetProjectTasksQueryDto } from "./dto/get-project-tasks-query.dto";
import {
  buildProjectTaskWhere,
  buildTaskStatusCounts,
  taskInclude,
} from "./task-query";
import { lockProject } from "../project/project-transaction";
import { normalizeTaskRank } from "./task-rank";
import { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";
import { KAFKA_EVENTS } from "../../common/constants/kafka.constants";
import {
  resolveProfilesForItem,
  resolveProfilesForItems,
} from "../../common/utils/profile-mapper.util";

const taskWithCount = taskInclude;
const TASK_PROGRESS_FIELDS = new Set<keyof UpdateTaskDto>(['status', 'rank']);

function isTaskProgressUpdate(dto: UpdateTaskDto): boolean {
  const fields = Object.entries(dto)
    .filter(([, value]) => value !== undefined)
    .map(([field]) => field as keyof UpdateTaskDto);
  return (
    fields.length > 0 && fields.every((field) => TASK_PROGRESS_FIELDS.has(field))
  );
}

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly activities: ActivityService,
    private readonly notifications: NotificationOutboxService,
    private readonly userProfiles: UserProfileSnapshotService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateTaskDto) {
    await this.access.requireCanCreateTask(userId, projectId);
    const startDate = this.toDate(dto.startDate);
    const dueDate = this.toDate(dto.dueDate);
    this.validateDateRange(startDate, dueDate);
    if (dto.assigneeUserId) {
      await this.requireActiveMember(projectId, dto.assigneeUserId);
    }

    const now = new Date();
    const status = dto.status ?? TaskStatus.TODO;
    const task = await this.prisma.$transaction(async (tx) => {
      const projectSequence = await tx.project.update({
        where: { id: projectId },
        data: { nextTaskNumber: { increment: 1 } },
        select: { nextTaskNumber: true },
      });
      await this.validateParent(projectId, dto.parentTaskId, undefined, tx);
      const created = await tx.task.create({
        data: {
          id: crypto.randomUUID(),
          projectId,
          parentTaskId: dto.parentTaskId,
          taskNumber: projectSequence.nextTaskNumber - 1,
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
          createdAt: now,
          updatedAt: now,
          assignees: dto.assigneeUserId
            ? {
                create: {
                  id: crypto.randomUUID(),
                  userId: dto.assigneeUserId,
                  assignedAt: now,
                },
              }
            : undefined,
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
      if (dto.assigneeUserId && dto.assigneeUserId !== userId) {
        await this.notifications.enqueueNotification(
          {
            recipientId: dto.assigneeUserId,
            senderId: userId,
            type: KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED,
            title: "You were assigned a task",
            content: `Task "${created.title}" was assigned to you.`,
            link: `/projects/${projectId}`,
            metadata: { taskId: created.id, projectId },
          },
          tx,
        );
      }
      return created;
    });

    const profiles = await resolveProfilesForItem(
      this.userProfiles,
      task,
      (t) => [
        ...(t.assignees?.map((a) => a.userId) ?? []),
        t.createdBy,
        t.reporterId,
      ],
    );
    return toTaskResponse(task, profiles);
  }

  async findAll(userId: string, projectId: string, query: GetProjectTasksQueryDto) {
    await this.access.requireReadAccess(userId, projectId);
    const where = buildProjectTaskWhere(projectId, userId, query);
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
    const profiles = await resolveProfilesForItems(
      this.userProfiles,
      tasks,
      (t) => [
        ...(t.assignees?.map((a) => a.userId) ?? []),
        t.createdBy,
        t.reporterId,
      ],
    );
    return paginate(
      tasks.map((task) => toTaskResponse(task, profiles)),
      total,
      query,
    );
  }

  async statusCounts(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    const rows = await this.prisma.task.groupBy({
      by: ["status"],
      where: {
        projectId,
        archived: false,
        deletedAt: null,
      },
      _count: { _all: true },
    });
    return buildTaskStatusCounts(rows);
  }

  async findOne(userId: string, taskId: string) {
    const task = await this.findTask(taskId);
    await this.access.requireReadAccess(userId, task.projectId);
    const profiles = await resolveProfilesForItem(
      this.userProfiles,
      task,
      (t) => [
        ...(t.assignees?.map((a) => a.userId) ?? []),
        t.createdBy,
        t.reporterId,
      ],
    );
    return toTaskResponse(task, profiles);
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const current = await this.findTask(taskId);
    if (isTaskProgressUpdate(dto)) {
      await this.access.requireCanContributeTask(
        userId,
        current.projectId,
        current.createdBy,
        current.assignees.map((assignee) => assignee.userId),
      );
    } else {
      await this.access.requireCanEditTask(
        userId,
        current.projectId,
        current.createdBy,
      );
    }
    assertTaskEditable(current.status);

    if (dto.title !== undefined && !dto.title.trim()) {
      throw new BadRequestException("Task title cannot be empty");
    }
    if (dto.clearParent && dto.parentTaskId) {
      throw new ConflictException(
        "A task cannot be assigned and unassigned at the same time",
      );
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
          await this.validateParent(current.projectId, dto.parentTaskId, current.id, tx);
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
              type: KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED,
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
                type: KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UPDATED,
                title: "Task updated",
                content: `Task "${updated.title}" was just updated.`,
                link: `/projects/${current.projectId}`,
                metadata: { taskId: current.id, projectId: current.projectId },
              },
              tx,
            );
          }
        }
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
    const profiles = await resolveProfilesForItem(
      this.userProfiles,
      task,
      (t) => [
        ...(t.assignees?.map((a) => a.userId) ?? []),
        t.createdBy,
        t.reporterId,
      ],
    );
    return toTaskResponse(task, profiles);
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
        await tx.task.updateMany({ where: { id: { in: children.map((child) => child.id) } }, data: { parentTaskId: null, version: { increment: 1 } } });
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
  ): Promise<void> {
    if (!parentTaskId) return;
    if (parentTaskId === currentTaskId)
      throw new ConflictException("A task cannot be its own parent");

    const parent = await database.task.findFirst({
      where: { id: parentTaskId, projectId, deletedAt: null },
      select: {
        archived: true,
        parentTaskId: true,
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
    if (dto.assigneeUserId !== undefined)
      changes.push([
        "assigneeUserId",
        current.assignees[0]?.userId,
        dto.assigneeUserId,
      ]);
    await this.activities.recordMany(current.id, actorId, changes, database);
  }
}
