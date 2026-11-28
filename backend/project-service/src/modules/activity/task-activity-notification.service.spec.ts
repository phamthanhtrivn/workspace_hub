import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Prisma } from '@prisma/client';
import type { ProjectNotification } from '../../common/adapters/project-communication.port';
import type { NotificationOutboxService } from '../notification-outbox/notification-outbox.service';
import { TaskActivityNotificationService } from './task-activity-notification.service';

function fixture() {
  const sent: ProjectNotification[] = [];
  const active = new Set([
    'owner',
    'creator',
    'assignee',
    'previous',
    'commenter',
  ]);
  const task = {
    id: 'task',
    title: 'Review',
    taskNumber: 5,
    projectId: 'project',
    createdBy: 'creator',
    deletedAt: null as Date | null,
    project: { id: 'project', name: 'Workspace', ownerId: 'owner' },
    assignees: [{ userId: 'assignee' }],
  };
  const tx = {
    task: { findUnique: async () => task },
    projectMember: {
      findMany: async ({
        where,
      }: {
        where: { userId: { in: string[] }; status: string };
      }) => {
        assert.equal(where.status, 'ACTIVE');

        return where.userId.in
          .filter((id) => active.has(id))
          .map((userId) => ({ userId }));
      },
    },
    taskComment: {
      findMany: async () => [
        { authorId: 'commenter' },
        { authorId: 'former-member' },
      ],
    },
  } as unknown as Prisma.TransactionClient;
  const outbox = {
    enqueueNotification: async (
      notification: ProjectNotification,
      database: unknown,
    ) => {
      assert.equal(
        database,
        tx,
        'notification intent must share the mutation transaction',
      );
      sent.push(notification);
    },
  } as unknown as NotificationOutboxService;

  return {
    task,
    tx,
    active,
    sent,
    service: new TaskActivityNotificationService(outbox),
  };
}

test('task updates notify current assignee, creator and owner once, excluding the actor', async () => {
  const f = fixture();
  await f.service.notify(
    'task',
    'creator',
    [
      ['priority', 'LOW', 'HIGH'],
      ['description', 'old', 'new'],
    ],
    f.tx,
  );
  assert.deepEqual(f.sent.map((event) => event.recipientId).sort(), [
    'assignee',
    'owner',
  ]);
  assert.equal(f.sent[0].metadata?.changes instanceof Array, true);
  assert.match(f.sent[0].link!, /taskId=task/);
});
test('reassignment alerts the former assignee once; later changes only reach the new assignee and ongoing roles', async () => {
  const f = fixture();
  await f.service.notify(
    'task',
    'owner',
    [['assigneeUserId', 'previous', 'assignee']],
    f.tx,
  );
  assert.equal(
    f.sent.find((event) => event.recipientId === 'previous')?.type,
    'PROJECT_TASK_UNASSIGNED',
  );
  assert.equal(
    f.sent.find((event) => event.recipientId === 'assignee')?.type,
    'PROJECT_TASK_ASSIGNED',
  );
  f.sent.length = 0;
  await f.service.notify('task', 'owner', [['title', 'old', 'new']], f.tx);
  assert.equal(
    f.sent.some((event) => event.recipientId === 'previous'),
    false,
  );
});
test('comment notifications include comment participants and name the comment and task', async () => {
  const f = fixture();
  await f.service.notify(
    'task',
    'owner',
    [['comment_created', null, 'Please review']],
    f.tx,
  );
  assert.deepEqual(f.sent.map((event) => event.recipientId).sort(), [
    'assignee',
    'commenter',
    'creator',
  ]);
  assert.match(f.sent[0].content, /comment in TASK-5/);
  assert.equal(f.sent[0].metadata?.activityKind, 'COMMENT');
});
test('removed project members and unchanged fields never receive notifications', async () => {
  const f = fixture();
  f.active.delete('assignee');
  await f.service.notify('task', 'owner', [['title', 'same', 'same']], f.tx);
  assert.equal(f.sent.length, 0);
  await f.service.notify(
    'task',
    'owner',
    [['documents.attached', null, ['report.pdf']]],
    f.tx,
  );
  assert.deepEqual(
    f.sent.map((event) => event.recipientId),
    ['creator'],
  );
});
test('overlapping owner/creator/assignee identities are deduplicated', async () => {
  const f = fixture();
  f.task.createdBy = 'owner';
  f.task.assignees = [{ userId: 'owner' }];
  await f.service.notify(
    'task',
    'commenter',
    [['status', 'TODO', 'DONE']],
    f.tx,
  );
  assert.deepEqual(
    f.sent.map((event) => event.recipientId),
    ['owner'],
  );
});
test('deleted task notifications link to the project instead of an unavailable detail', async () => {
  const f = fixture();
  f.task.deletedAt = new Date();
  await f.service.notify('task', 'owner', [['deleted', null, 'now']], f.tx);
  assert.equal(f.sent[0].type, 'PROJECT_TASK_DELETED');
  assert.equal(f.sent[0].link, '/projects/project');
});
