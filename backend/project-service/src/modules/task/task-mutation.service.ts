import { TASK_LIFECYCLE } from "./task-lifecycle.constants";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { isTerminalTaskStatus, TaskStatus } from "../project/project.enums";
import { PrismaService } from "../../common/prisma/prisma.service";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { ProjectAccessService } from "../project/project-access.service";
import { toTaskResponse } from "../project/project.mapper";
import { ActivityService } from "../activity/activity.service";
import { NotificationOutboxService } from "../notification-outbox/notification-outbox.service";
import {
  assertTaskEditable,
  assertTaskStatusTransition,
} from "./task-edit.guard";
import {
  isRecordNotFoundError,
  rethrowWriteConflict,
} from "../../common/prisma/prisma-errors";
import { taskInclude } from "./task-query";
import { lockProject } from "../project/project-transaction";
import { normalizeTaskRank } from "./task-rank";
import { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";
import { KAFKA_EVENTS } from "../../common/constants/kafka.constants";
import { resolveProfilesForItem } from "../../common/utils/profile-mapper.util";
import { TaskSyncOutboxService } from "../task-sync/task-sync-outbox.service";
import { TaskLookupService } from "./task-lookup.service";
import { TaskValidationService } from "./task-validation.service";
import { TaskActivityService } from "./task-activity.service";

const taskWithCount = taskInclude;

const TASK_PROGRESS_FIELDS = new Set<keyof UpdateTaskDto>(["status", "rank"]);

function isTaskProgressUpdate(dto: UpdateTaskDto): boolean {
  const fields = Object.entries(dto)
    .filter(([, value]) => value !== undefined)
    .map(([field]) => field as keyof UpdateTaskDto);
  return (
    fields.length > 0 &&
    fields.every((field) => TASK_PROGRESS_FIELDS.has(field))
  );
}

@Injectable()
export class TaskMutationService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationOutboxService,
    private readonly taskSync: TaskSyncOutboxService,
    private readonly userProfiles: UserProfileSnapshotService,
    private readonly activities: ActivityService,
    private readonly lookup: TaskLookupService,
    private readonly validation: TaskValidationService,
    private readonly activity: TaskActivityService,
  ) {}
  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const current = await this.lookup.findTask(taskId);
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
      await this.validation.requireActiveMember(
        current.projectId,
        dto.assigneeUserId,
      );
    }

    const startDate =
      dto.startDate !== undefined
        ? this.validation.toDate(dto.startDate)
        : current.startDate;
    const dueDate =
      dto.dueDate !== undefined
        ? this.validation.toDate(dto.dueDate)
        : current.dueDate;
    this.validation.validateDateRange(startDate, dueDate);

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
          await this.validation.validateParent(
            current.projectId,
            dto.parentTaskId,
            current.id,
            tx,
          );
        }
        if (dto.status === TaskStatus.DONE) {
          await this.validation.assertCanCompleteTaskWithSubtasks(
            current.id,
            tx,
          );
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
        await this.activity.recordChanges(current, updated, dto, userId, tx);
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
        await this.taskSync.enqueue(updated, tx);
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

  async reopen(userId: string, taskId: string) {
    const initial = await this.lookup.findTask(taskId);
    await this.access.requireCanEditTask(
      userId,
      initial.projectId,
      initial.createdBy,
    );
    const reopened = await this.prisma.$transaction(async (tx) => {
      await lockProject(tx, initial.projectId);
      await this.access.requireCanEditTask(
        userId,
        initial.projectId,
        initial.createdBy,
      );
      const current = await tx.task.findFirst({
        where: { id: taskId, deletedAt: null },
        include: taskWithCount,
      });
      if (!current) throw new NotFoundException("Task not found");
      if (current.archived)
        throw new ConflictException(TASK_LIFECYCLE.archivedMessage);
      if (current.parentTaskId) {
        const parent = await tx.task.findUnique({
          where: { id: current.parentTaskId },
        });
        if (
          !parent ||
          parent.deletedAt ||
          parent.archived ||
          isTerminalTaskStatus(parent.status)
        ) {
          throw new ConflictException({
            code: TASK_LIFECYCLE.parentClosed,
            message: TASK_LIFECYCLE.parentClosedMessage,
          });
        }
      }
      if (!isTerminalTaskStatus(current.status)) return current;
      const updated = await tx.task.update({
        where: { id: taskId, version: current.version },
        data: {
          status: TaskStatus.TODO,
          completedAt: null,
          completedBy: null,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
        include: taskWithCount,
      });
      await this.activities.record(
        taskId,
        userId,
        "status",
        current.status,
        TaskStatus.TODO,
        tx,
      );
      await this.taskSync.enqueue(updated, tx);
      return updated;
    });
    const profiles = await resolveProfilesForItem(
      this.userProfiles,
      reopened,
      (t) => [...t.assignees.map((a) => a.userId), t.createdBy, t.reporterId],
    );
    return toTaskResponse(reopened, profiles);
  }

  async delete(userId: string, taskId: string): Promise<void> {
    const task = await this.lookup.findTask(taskId);
    await this.access.requireCanEditTask(
      userId,
      task.projectId,
      task.createdBy,
    );
    assertTaskEditable(task.status);
    try {
      await this.prisma.$transaction(async (tx) => {
        await lockProject(tx, task.projectId);
        const children = await tx.task.findMany({
          where: { parentTaskId: task.id, deletedAt: null },
          select: { id: true, status: true },
        });
        children.forEach((child) => assertTaskEditable(child.status));
        await tx.task.updateMany({
          where: { id: { in: children.map((child) => child.id) } },
          data: { parentTaskId: null, version: { increment: 1 } },
        });
        const deleted = await tx.task.update({
          where: { id: taskId, version: task.version },
          data: {
            archived: true,
            deletedAt: new Date(),
            version: { increment: 1 },
          },
        });
        await this.taskSync.enqueue(deleted, tx);
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
}
