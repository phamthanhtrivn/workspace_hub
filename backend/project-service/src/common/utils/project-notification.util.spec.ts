import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInvitationResponseNotification } from './project-notification.util';

test('accepted and declined invitations notify the actual inviter with full project and response context', () => {
  for (const status of ['ACCEPTED', 'DECLINED'] as const) {
    const notification = buildInvitationResponseNotification(
      {
        id: 'invitation',
        projectId: 'project',
        invitedBy: 'inviter-not-owner',
        invitedUserId: 'invitee',
        project: { name: 'Workspace' },
        createdAt: new Date('2026-11-01T10:00:00Z'),
      },
      status,
    );
    assert.equal(notification.recipientId, 'inviter-not-owner');
    assert.equal(notification.senderId, 'invitee');
    assert.equal(notification.type, `PROJECT_INVITATION_${status}`);
    assert.equal(notification.metadata?.status, status);
    assert.equal(notification.metadata?.invitedAt, '2026-11-01T10:00:00.000Z');
    assert.ok(notification.metadata?.respondedAt);
    assert.equal(notification.link, '/projects/project');
  }
});
