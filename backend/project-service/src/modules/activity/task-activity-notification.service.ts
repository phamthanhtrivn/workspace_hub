import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KAFKA_EVENTS } from '../../common/constants/kafka.constants';
import { buildTaskNotification } from '../../common/utils/task-notification.util';
import { NotificationOutboxService } from '../notification-outbox/notification-outbox.service';
import type { ActivityChange } from './activity.service';
import { ProjectMemberStatus } from '../project/project.enums';

type Database = PrismaService | Prisma.TransactionClient;
export const TASK_ACTIVITY_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  priority: 'Priority',
  status: 'Status',
  startDate: 'Start date',
  dueDate: 'Due date',
  allDay: 'All day',
  rank: 'Position',
  parentTaskId: 'Parent task',
  assigneeUserId: 'Assignee',
  comment_created: 'Comment added',
  comment_updated: 'Comment edited',
  comment_deleted: 'Comment deleted',
  checklist_created: 'Checklist item added',
  checklist_completed: 'Checklist item completion changed',
  checklist_deleted: 'Checklist item deleted',
  'documents.attached': 'Files attached',
  'documents.detached': 'File removed',
  label_attached: 'Label added',
  label_detached: 'Label removed',
  subtask_created: 'Subtask added',
  subtask_removed: 'Subtask removed',
  deleted: 'Task deleted',
  created: 'Task created',
  dependency: 'Dependency changed',
  label_updated: 'Label updated',
};

function serialize(value: unknown): string | null {
  return value == null
    ? null
    : typeof value === 'string'
      ? value
      : JSON.stringify(value);
}

@Injectable()
export class TaskActivityNotificationService {
  constructor(private readonly outbox: NotificationOutboxService) {}

  async notify(
    taskId: string,
    actorId: string | null,
    changes: ActivityChange[],
    database: Database,
  ) {
    const changed = changes.filter(
      ([, before, after]) => serialize(before) !== serialize(after),
    );
    if (!actorId || !changed.length) return;
    const task = await database.task.findUnique({
      where: { id: taskId },
      include: { project: true, assignees: true },
    });
    if (!task) return;
    const assignment = changed.find(([field]) => field === 'assigneeUserId');
    const previousAssignee =
      typeof assignment?.[1] === 'string' ? assignment[1] : null;
    const nextAssignee =
      typeof assignment?.[2] === 'string' ? assignment[2] : null;
    const recipientIds = new Set(
      task.assignees.map((assignee) => assignee.userId),
    );
    recipientIds.add(task.createdBy);
    recipientIds.add(task.project.ownerId);
    const isComment = changed.some(([field]) => field.startsWith('comment_'));
    if (isComment) {
      const participants = await database.taskComment.findMany({
        where: { taskId },
        distinct: ['authorId'],
        select: { authorId: true },
      });
      participants.forEach(({ authorId }) => recipientIds.add(authorId));
    }
    if (previousAssignee) recipientIds.add(previousAssignee);
    const members = await database.projectMember.findMany({
      where: {
        projectId: task.projectId,
        status: ProjectMemberStatus.ACTIVE,
        userId: { in: [...recipientIds] },
      },
      select: { userId: true },
    });
    for (const { userId } of members) {
      if (userId === actorId) continue;
      const removed =
        assignment && userId === previousAssignee && userId !== nextAssignee;
      const assigned =
        (assignment &&
          userId === nextAssignee &&
          userId !== previousAssignee) ||
        (changed.some(([field]) => field === 'created') &&
          task.assignees.some((assignee) => assignee.userId === userId));
      const notification = buildTaskNotification({
        type: removed
          ? KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UNASSIGNED
          : assigned
            ? KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED
            : task.deletedAt
              ? KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_DELETED
              : KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UPDATED,
        recipientId: userId,
        senderId: actorId,
        project: task.project,
        task,
      });
      notification.metadata = {
        ...notification.metadata,
        changes: changed.map(([field, before, after]) => ({
          field,
          label: TASK_ACTIVITY_LABELS[field] ?? field,
          before: serialize(before),
          after: serialize(after),
        })),
      };
      if (isComment) {
        notification.title = 'Comment in your task';
        notification.content = `A comment in TASK-${task.taskNumber} "${task.title}" in project "${task.project.name}" was ${changed[0][0] === 'comment_created' ? 'added' : changed[0][0] === 'comment_updated' ? 'edited' : 'deleted'}.`;
        notification.metadata.activityKind = 'COMMENT';
      }
      await this.outbox.enqueueNotification(notification, database);
    }
  }
}
