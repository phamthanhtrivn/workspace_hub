const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { payload } = require('../fixtures/calendar-reminder.cjs');
const { CalendarReminderEmailService } = require('../../src/modules/notification/calendar-reminder-email.service');
const databaseUrl = process.env.REMINDER_TEST_DATABASE_URL;
test('PostgreSQL reminder delivery concurrency and durable email outcomes', { skip: !databaseUrl }, async t => {
  assert.equal(new URL(databaseUrl).pathname, '/reminder_verification', 'Use only the isolated verification database');
  const { PrismaClient } = require('@prisma/client');
  const { CalendarReminderDeliveryService } = require('../../src/modules/notification/calendar-reminder-delivery.service');
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  t.after(() => prisma.$disconnect());
  const previousOrigin = process.env.FRONTEND_URL;
  process.env.FRONTEND_URL = 'https://workspace.example';
  t.after(() => { if (previousOrigin === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = previousOrigin; });
  const created = [], updated = [], pushes = [];
  const service = new CalendarReminderDeliveryService(prisma, {
    deliverCreated: (notification, options) => { assert.equal(options.sendPush, false); created.push(notification); },
    emitToUser: (_recipient, _event, notification) => updated.push(notification),
  }, { sendPushToUser: async (_recipient, push) => pushes.push(push) });
  await t.test('ALERT first, PUSH first, concurrent and replay all share one notification and one push', async () => {
    for (const order of [['ALERT', 'PUSH'], ['PUSH', 'ALERT'], ['ALERT', 'PUSH', 'PUSH', 'ALERT']]) {
      const input = payload('ALERT'); const recipientId = input.recipients[0].userId;
      const before = pushes.length;
      if (order.length > 2) await Promise.all(order.map(method => service.deliver({ ...input, method }, recipientId)));
      else for (const method of order) await service.deliver({ ...input, method }, recipientId);
      assert.equal(await prisma.notification.count({ where: { recipientId } }), 1);
      assert.equal(pushes.length - before, 1);
      const saved = await prisma.notification.findFirst({ where: { recipientId } });
      assert.deepEqual(saved.metadata.channels, ['ALERT', 'PUSH']);
      assert.equal(saved.metadata.method, 'PUSH');
      assert.ok(saved.pushClaimedAt);
      assert.equal(pushes.at(-1).tag, `calendar:${input.groupKey}`);
    }
    assert.equal(created.length, 3);
    assert.ok(updated.some(notification => notification.metadata.method === 'PUSH'));
  });
  await t.test('different schedules for the same event remain independent', async () => {
    const input = payload('PUSH'); const recipientId = input.recipients[0].userId;
    await service.deliver(input, recipientId);
    await service.deliver({ ...input, groupKey: createHash('sha256').update('new schedule').digest('hex') }, recipientId);
    assert.equal(await prisma.notification.count({ where: { recipientId } }), 2);
  });
  await t.test('email accepted once, definite rejection capped at three, unknown and missing addresses not resent', async () => {
    let sends = 0, failure;
    const email = new CalendarReminderEmailService(prisma, {
      prepareCalendarReminderEmail: input => input,
      sendPreparedCalendarReminder: async () => { sends++; if (failure) throw failure; },
    });
    const run = async (input, times = 5) => {
      for (let attempt = 0; attempt < times; attempt++) await email.deliver(input, input.recipients[0]).catch(() => undefined);
      return prisma.reminderEmailDelivery.findUnique({ where: { groupKey_recipientId: { groupKey: input.groupKey, recipientId: input.recipients[0].userId } } });
    };
    let input = payload(); let receipt = await run(input);
    assert.equal(sends, 1); assert.equal(receipt.status, 'SENT');
    input = payload(); failure = { responseCode: 450 }; sends = 0;
    receipt = await run(input); assert.equal(sends, 3); assert.equal(receipt.status, 'FAILED');
    input = payload(); failure = { code: 'ETIMEDOUT', command: 'DATA' }; sends = 0;
    receipt = await run(input); assert.equal(sends, 1); assert.equal(receipt.status, 'UNKNOWN');
    input = payload(); input.recipients[0].email = null; sends = 0;
    receipt = await run(input); assert.equal(sends, 0); assert.equal(receipt.status, 'SKIPPED');
    failure = undefined; input = payload(); sends = 0;
    await Promise.all([email.deliver(input, input.recipients[0]), email.deliver(input, input.recipients[0])].map(promise => promise.catch(() => undefined)));
    await run(input); assert.equal(sends, 1);
  });
  await t.test('stale processing email is marked unknown, never resent', async () => {
    const input = payload(); let sends = 0;
    await prisma.reminderEmailDelivery.create({ data: { groupKey: input.groupKey, recipientId: input.recipients[0].userId, status: 'PROCESSING', attempts: 1, claimedAt: new Date(Date.now() - 600000) } });
    const email = new CalendarReminderEmailService(prisma, { prepareCalendarReminderEmail: input => input, sendPreparedCalendarReminder: async () => { sends++; } });
    await email.deliver(input, input.recipients[0]);
    assert.equal(sends, 0);
    const receipt = await prisma.reminderEmailDelivery.findUnique({ where: { groupKey_recipientId: { groupKey: input.groupKey, recipientId: input.recipients[0].userId } } });
    assert.equal(receipt.status, 'UNKNOWN');
  });
});
