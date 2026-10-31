import { Injectable } from "@nestjs/common";
import { isTerminalTaskStatus, TaskStatus } from "../project/project.enums";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { ProjectAccessService } from "../project/project-access.service";
import { ProjectSpaceClient } from "../project/project-space.client";
import { toTaskResponse } from "../project/project.mapper";
import { ActivityService } from "../activity/activity.service";
import { NotificationOutboxService } from "../notification-outbox/notification-outbox.service";
import { taskInclude } from "./task-query";
import { normalizeTaskRank } from "./task-rank";
import { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";
import { KAFKA_EVENTS } from "../../common/constants/kafka.constants";
import { resolveProfilesForItem } from "../../common/utils/profile-mapper.util";
import { TaskSyncOutboxService } from "../task-sync/task-sync-outbox.service";
import { TaskValidationService } from "./task-validation.service";

const taskWithCount = taskInclude;

@Injectable()
export class TaskCreationService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly projectSpace: ProjectSpaceClient,
    private readonly prisma: PrismaService,
    private readonly activities: ActivityService,
    private readonly notifications: NotificationOutboxService,
    private readonly taskSync: TaskSyncOutboxService,
    private readonly userProfiles: UserProfileSnapshotService,
    private readonly validation: TaskValidationService,
  ) {}
  async create(userId: string, projectId: string, dto: CreateTaskDto) {
    await this.access.requireCanCreateTask(userId, projectId);
    if (dto.channelId) {
      await this.projectSpace.assertCanCreateTaskInChannel(
        projectId,
        dto.channelId,
        userId,
      );
    }
    const startDate = this.validation.toDate(dto.startDate);
    const dueDate = this.validation.toDate(dto.dueDate);
    this.validation.validateDateRange(startDate, dueDate);
    if (dto.assigneeUserId) {
      await this.validation.requireActiveMember(projectId, dto.assigneeUserId);
    }

    const now = new Date();
    const status = dto.status ?? TaskStatus.TODO;
    const task = await this.prisma.$transaction(async (tx) => {
      const projectSequence = await tx.project.update({
        where: { id: projectId },
        data: { nextTaskNumber: { increment: 1 } },
        select: { nextTaskNumber: true },
      });
      await this.validation.validateParent(
        projectId,
        dto.parentTaskId,
        undefined,
        tx,
      );
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
      await this.taskSync.enqueue(created, tx);
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
}
