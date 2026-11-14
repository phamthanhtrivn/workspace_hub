const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { buildCalendarReminderEmail } = require('../dist/modules/notification/templates/calendar-reminder.template');
const { parseCalendarReminder } = require('../dist/modules/notification/events/calendar-reminder.payload');
const { CalendarReminderEmailService, isDefiniteEmailFailure } = require('../dist/modules/notification/calendar-reminder-email.service');
const { CalendarReminderEvent } = require('../dist/modules/notification/events/calendar-reminder.event');

function payload(method = 'EMAIL', extra = {}) {
  return {
    eventType: 'CALENDAR_REMINDER_DUE', deliveryId: randomUUID(), groupKey: createHash('sha256').update(randomUUID()).digest('hex'), method,
    minutesBefore: 10,
    event: { id: randomUUID(), title: 'Thảo luận luận văn', startAt: '2030-01-01T03:00:00Z', endAt: '2030-01-01T04:00:00Z', timeZone: 'Asia/Bangkok' },
    recipients: [{ userId: randomUUID(), email: 'test@example.invalid' }], ...extra,
  };
}

test('payload accepts legacy messages and validates optional reminder context', () => {
  const legacy = payload(); delete legacy.groupKey;
  assert.equal(parseCalendarReminder(legacy).deliveryId, legacy.deliveryId);
  for (const patch of [{ minutesBefore: -1 }, { groupKey: 'bad' }, { scheduledAt: 'invalid' }]) assert.throws(() => parseCalendarReminder(payload('ALERT', patch)));
  for (const patch of [{ timeZone: 'invalid' }, { allDay: 'yes' }, { endAt: 'invalid' }]) {
    const current = payload(); Object.assign(current.event, patch);
    assert.throws(() => parseCalendarReminder(current));
  }
});

const templateInput = {
  recipientEmail: 'test@example.invalid', recipientName: 'Trí <script>', eventTitle: 'Đề tài <b>mới</b>', sourceType: 'TASK',
  startAt: '2030-01-01T03:00:00Z', endAt: '2030-01-01T04:00:00Z', timeZone: 'Asia/Bangkok', calendarName: 'Cá nhân',
  minutesBefore: 60, location: 'Phòng A & B', description: 'Dòng một\nDòng hai <img src=x>\n' + 'TiếngViệt'.repeat(200),
  eventUrl: 'https://workspace.example/calendar?eventId=test&source=email',
};
test('email renders complete escaped Vietnamese content with explicit calendar timezone and text alternative', () => {
  const message = buildCalendarReminderEmail(templateInput);
  assert.match(message.subject, /^Task reminder:/);
  for (const expected of ['Cá nhân', 'Asia/Bangkok', '1 hour before start', '10:00 AM', '11:00 AM']) assert.ok(message.text.includes(expected), expected);
  assert.ok(message.text.includes(templateInput.description));
  assert.match(message.html, /Trí &lt;script&gt;/);
  assert.match(message.html, /Dòng một<br>Dòng hai &lt;img/);
  assert.ok(!message.html.includes('<img src=x>'));
  assert.ok(!message.html.includes('<b>mới</b>'));
  assert.match(message.html, /max-width:600px/);
  assert.match(message.html, /#22396f/);
});
test('all-day exclusive ends, multi-day ranges, UTC fallback and empty fields', () => {
  const single = buildCalendarReminderEmail({ ...templateInput, allDay: true, startAt: '2030-01-01T00:00:00Z', endAt: '2030-01-02T00:00:00Z', timeZone: 'UTC', description: '', location: '' });
  assert.ok(single.text.includes('January 1, 2030 · All day'));
  assert.ok(!single.text.includes('January 2'));
  assert.ok(!single.text.includes('Description'));
  const multiple = buildCalendarReminderEmail({ ...templateInput, allDay: true, startAt: '2030-01-01T00:00:00Z', endAt: '2030-01-04T00:00:00Z', timeZone: 'UTC' });
  assert.ok(multiple.text.includes('January 3, 2030'));
  const fallback = buildCalendarReminderEmail({ recipientEmail: 'test@example.invalid', eventTitle: 'Legacy', startAt: '2030-01-01T03:00:00Z', eventUrl: templateInput.eventUrl });
  assert.match(fallback.text, /Time zone: UTC/);
  assert.ok(!fallback.text.includes('undefined'));
});
test('SMTP classification retries definite rejections and never retries uncertain DATA outcomes', () => {
  assert.equal(isDefiniteEmailFailure({ responseCode: 450 }), true);
  assert.equal(isDefiniteEmailFailure({ code: 'ECONNECTION' }), true);
  assert.equal(isDefiniteEmailFailure({ code: 'ETIMEDOUT', command: 'CONN' }), true);
  assert.equal(isDefiniteEmailFailure({ code: 'ETIMEDOUT', command: 'DATA' }), false);
  assert.equal(isDefiniteEmailFailure({ code: 'ECONNRESET', command: 'DATA' }), false);
});

test('SMTP acceptance is required before the email is considered sent', async () => {
  const { EmailService } = require('../dist/modules/notification/email.service');
  const email = new EmailService();
  await assert.doesNotReject(email.sendPreparedCalendarReminder({ mail: {}, transporter: { sendMail: async () => ({ accepted: ['test@example.invalid'] }) } }));
  await assert.rejects(email.sendPreparedCalendarReminder({ mail: {}, transporter: { sendMail: async () => ({ accepted: [], rejected: ['test@example.invalid'] }) } }), error => error.code === 'EENVELOPE');
  await assert.rejects(email.sendPreparedCalendarReminder({ mail: {}, transporter: { sendMail: async () => { throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT', command: 'DATA' }); } } }), error => error.command === 'DATA');
});
test('recipient failure does not prevent processing remaining recipients', async () => {
  const input = payload(); input.recipients.push({ userId: randomUUID(), email: 'second@example.invalid' });
  const seen = [];
  const controller = new CalendarReminderEvent({}, { deliver: async (_payload, recipient) => { seen.push(recipient.userId); if (seen.length === 1) throw new Error('dependency'); } });
  await assert.rejects(controller.handle(input));
  assert.equal(seen.length, 2);
});

const databaseUrl = process.env.REMINDER_TEST_DATABASE_URL;
test('PostgreSQL reminder delivery concurrency and durable email outcomes', { skip: !databaseUrl }, async t => {
  assert.equal(new URL(databaseUrl).pathname, '/reminder_verification', 'Use only the isolated verification database');
  const { PrismaClient } = require('@prisma/client');
  const { CalendarReminderDeliveryService } = require('../dist/modules/notification/calendar-reminder-delivery.service');
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
