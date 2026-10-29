const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NotificationService } = require('../dist/modules/notification/notification.service');
const { Prisma } = require('@prisma/client');

test('single and bulk reads notify all sessions of the recipient', async () => {
  const events = [];
  const service = new NotificationService({ notification: {
    findFirst: async () => ({ id: 'notification', recipientId: 'user' }),
    update: async () => ({ id: 'notification', isRead: true }), updateMany: async () => ({ count: 3 }),
  } }, { server: { to: room => ({ emit: (event, payload) => events.push({ room, event, payload }) }) } }, {});
  await service.markAsRead('notification', 'user'); await service.markAllAsRead('user');
  assert.deepEqual(events.map(event => [event.room, event.event, event.payload.reason]), [
    ['user', 'notifications_changed', 'READ'], ['user', 'notifications_changed', 'READ_ALL'],
  ]);
});

test('read operations cannot update another recipient notification', async () => {
  let updated = false;
  const service = new NotificationService({ notification: {
    findFirst: async () => null, update: async () => { updated = true; },
  } }, {}, {});
  assert.equal(await service.markAsRead('foreign', 'user'), null); assert.equal(updated, false);
});

test('replayed Calendar outbox delivery persists and publishes only once per recipient', async () => {
  const records = new Map(), events = [];
  const service = new NotificationService({ notification: {
    create: async ({ data }) => {
      if (records.has(data.id)) throw new Prisma.PrismaClientKnownRequestError('Duplicate', { code: 'P2002', clientVersion: '6' });
      records.set(data.id, data); return data;
    }, findUniqueOrThrow: async ({ where }) => records.get(where.id),
  } }, { server: { to: room => ({ emit: (event, notification) => events.push({ room, event, notification }) }) } }, {});
  const dto = { recipientId: 'user', metadata: { deliveryId: 'outbox-id' }, title: 'Calendar invitation' };
  const first = await service.createNotification(dto, { sendPush: false });
  const replay = await service.createNotification(dto, { sendPush: false });
  assert.equal(first.id, replay.id); assert.equal(records.size, 1); assert.equal(events.length, 1);
});
