import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NotificationType } from '@prisma/client';
import { SpaceNotificationEvent } from './space-notification.event';
import type { SpaceInvitationNotificationHandler } from './space-invitation-notification.service';
import type { NotificationService } from '../notification.service';
import { getNotificationCategoryWhere } from '../types/notification.types';

test('project responses, task removal, permissions, membership and personal sharing events reach persistence', async () => {
  const received: string[] = [];
  const controller = new SpaceNotificationEvent(
    {
      handle: (payload: { type: string }) => {
        received.push(payload.type);

        return Promise.resolve();
      },
    } as unknown as SpaceInvitationNotificationHandler,
    {} as NotificationService,
  );
  const types = [
    NotificationType.PROJECT_INVITATION_ACCEPTED,
    NotificationType.PROJECT_INVITATION_DECLINED,
    NotificationType.PROJECT_TASK_UNASSIGNED,
    NotificationType.PROJECT_TASK_DELETED,
    NotificationType.PROJECT_PERMISSIONS_UPDATED,
    NotificationType.PROJECT_MEMBER_REMOVED,
    NotificationType.DOCUMENT_SHARED,
    NotificationType.DOCUMENT_PERMISSION_UPDATED,
    NotificationType.DOCUMENT_SHARE_REMOVED,
  ];
  for (const type of types)
    await controller.handleSpaceInvitationNotificationEvent({
      recipientId: 'recipient',
      senderId: 'actor',
      type,
      title: 'Notification',
      content: 'Details',
      metadata: {},
    });
  assert.deepEqual(received, types);
});
test('project query filters include every new project type; personal document links are counted under Document', () => {
  const where = getNotificationCategoryWhere('PROJECT');
  const types = (where.type as { in: NotificationType[] }).in;
  assert.ok(types.includes(NotificationType.PROJECT_MEMBER_REMOVED));
  assert.ok(types.includes(NotificationType.PROJECT_INVITATION_ACCEPTED));
  assert.ok(types.includes(NotificationType.PROJECT_TASK_UNASSIGNED));
  assert.deepEqual(getNotificationCategoryWhere('DOCUMENT'), {
    OR: [
      { type: { in: [NotificationType.DOCUMENT_SHARED, NotificationType.DOCUMENT_PERMISSION_UPDATED, NotificationType.DOCUMENT_SHARE_REMOVED] } },
      { link: { startsWith: '/documents' } },
    ],
  });
});
