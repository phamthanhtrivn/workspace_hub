import { CommentService } from './comment.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { ActivityService } from './activity.service';
import { NotificationOutboxService } from './notification-outbox.service';

describe('CommentService notifications', () => {
  it('notifies unique task stakeholders except the comment author', async () => {
    const tx = {
      taskComment: {
        create: jest.fn().mockResolvedValue({
          id: 'comment-1',
          taskId: 'task-1',
          authorId: 'author-1',
          content: 'Please review',
          edited: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    };
    const prisma = {
      task: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'task-1',
          projectId: 'project-1',
          title: 'Socket task',
          status: 'TODO',
          createdBy: 'creator-1',
          reporterId: 'author-1',
          assignees: [{ userId: 'assignee-1' }, { userId: 'creator-1' }],
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    } as unknown as PrismaService;
    const access = {
      requireWriteAccess: jest.fn(),
    } as unknown as ProjectAccessService;
    const activities = { record: jest.fn() } as unknown as ActivityService;
    const notifications = {
      enqueueNotification: jest.fn(),
    } as unknown as NotificationOutboxService;
    const service = new CommentService(prisma, access, activities, notifications);

    await service.create('author-1', 'task-1', { content: ' Please review ' });

    expect(notifications.enqueueNotification).toHaveBeenCalledTimes(2);
    expect(notifications.enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'creator-1',
        metadata: expect.objectContaining({ commentId: 'comment-1', event: 'TASK_COMMENTED' }),
      }),
      tx,
    );
    expect(notifications.enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'assignee-1' }),
      tx,
    );
  });
});
