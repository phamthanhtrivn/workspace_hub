import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { projectRequire, load, json, until } from './support.mjs';
import { withPrisma, seedProject } from './resource-access.mjs';
import { mount } from './http-boundaries.mjs';

export function registerOutboxTests(state) {
  test('task transactions roll back outbox intent; concurrent workers and stale owners cannot complete the same lease', async () => {
    await withPrisma(state, ['project'], async ({ project }) => {
      const { TaskSyncOutboxService } = load('project-service', 'modules/task-sync/task-sync-outbox.service.js');
      const { from } = projectRequire('rxjs');
      const producer = state.infrastructure.kafka.producer(); await producer.connect();
      const kafka = { emit: (topic, event) => from(producer.send({ topic, messages: [{ key: event.key, value: JSON.stringify(event.value) }] })) };
      const config = { outboxBatchSize: 1, outboxPollIntervalMs: 20 };
      const first = new TaskSyncOutboxService(project, kafka, config), second = new TaskSyncOutboxService(project, kafka, config);
      try {
        const owned = await seedProject(project, state.actorA.id);
        const task = await project.task.create({ data: { projectId: owned.id, taskNumber: 1, title: 'Original task', priority: 'MEDIUM', status: 'TODO', createdBy: state.actorA.id, reporterId: state.actorA.id, createdAt: new Date() } });
        await assert.rejects(project.$transaction(async (tx) => {
          await tx.task.update({ where: { id: task.id }, data: { title: 'Rolled back task' } });
          await first.enqueue(task, tx); throw new Error('test business rollback');
        }));
        assert.equal(await project.taskSyncOutbox.count({ where: { taskId: task.id } }), 0);
        assert.equal((await project.task.findUnique({ where: { id: task.id } })).title, 'Original task');
        await project.$transaction((tx) => first.enqueue(task, tx));
        await until(async () => (await project.$queryRaw`SELECT id FROM task_sync_outbox WHERE task_id=${task.id}::uuid AND next_attempt_at<=NOW()`).length === 1, 'task outbox record becomes eligible');
        const claims = await Promise.all([first.claimOne(), second.claimOne()]);
        assert.equal(claims.filter(Boolean).length, 1, 'one atomic lease across workers');
        const old = claims.find(Boolean);
        await project.$executeRaw`UPDATE task_sync_outbox SET lease_until=NOW()-INTERVAL '1 second' WHERE id=${old.id}::uuid`;
        const reclaimed = await second.claimOne();
        assert.ok(reclaimed && reclaimed.leaseToken !== old.leaseToken);
        await first.deliver(old);
        let row = await project.taskSyncOutbox.findUnique({ where: { id: old.id } });
        assert.equal(row.deliveredAt, null, 'expired owner cannot complete another lease');
        assert.equal(row.leaseToken, reclaimed.leaseToken);
        await second.deliver(reclaimed);
        row = await project.taskSyncOutbox.findUnique({ where: { id: old.id } });
        assert.ok(row.deliveredAt); assert.equal(row.leaseToken, null);
      } finally { await first.onModuleDestroy(); await second.onModuleDestroy(); await producer.disconnect(); }
    });
  });

  test('notification delivery retries after a lost HTTP response without duplicate rows or in-app effects', async () => {
    await withPrisma(state, ['project', 'notification'], async ({ project, notification }) => {
      const { NotificationMutationService } = load('notification-service', 'modules/notification/notification-mutation.service.js');
      const { NotificationController } = load('notification-service', 'modules/notification/notification.controller.js');
      let effects = 0;
      const receiver = new NotificationMutationService(notification, { deliverCreated: () => { effects++; } });
      const endpoint = await mount('notification-service', NotificationController, { values: { NotificationService: { createNotification: (body) => receiver.createNotification(body) } } });
      const { NotificationOutboxService } = load('project-service', 'modules/notification-outbox/notification-outbox.service.js');
      let loseResponse = true;
      const gateway = { send: async (body) => {
        const result = await json(endpoint.url, '/api/notifications/internal', { method: 'POST', body, headers: { 'x-internal-service-key': state.infrastructure.keys.PROJECT_TO_NOTIFICATION_KEY } });
        assert.equal(result.status, 201);
        if (loseResponse) throw new Error('test receiver committed but caller lost response');
      } };
      const worker = new NotificationOutboxService(project, { outboxBatchSize: 10, outboxMaxAttempts: 5 }, gateway, {}, {});
      try {
        const payload = { recipientId: state.actorA.id, type: 'PROJECT_TASK_ASSIGNED', title: 'Retry test', content: 'Retry test' };
        await worker.enqueueNotification(payload);
        await worker.drain();
        assert.equal(await notification.notification.count({ where: { recipientId: state.actorA.id } }), 1);
        assert.equal(effects, 1);
        loseResponse = false;
        await project.$executeRaw`UPDATE notification_outbox SET next_attempt_at=NOW() WHERE status='FAILED'`;
        await worker.drain();
        assert.equal(await notification.notification.count({ where: { recipientId: state.actorA.id } }), 1);
        assert.equal(effects, 1, 'deduplication must cover in-app effects');
        const rows = await project.$queryRaw`SELECT status FROM notification_outbox`;
        assert.ok(rows.length && rows.every((row) => row.status === 'SENT'));
        const deliveryId = randomUUID();
        await Promise.all([receiver.createNotification({ ...payload, metadata: { deliveryId } }), receiver.createNotification({ ...payload, metadata: { deliveryId } })]);
        await receiver.createNotification({ ...payload, recipientId: state.actorB.id, metadata: { deliveryId } });
        assert.equal(await notification.notification.count({ where: { metadata: { path: ['deliveryId'], equals: deliveryId } } }), 2, 'deduplication is per delivery and recipient');
      } finally { await endpoint.app.close(); }
    });
  });
}
