const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventRelationService } = require('../dist/modules/calendar-event/event-relation.service');
const { ReminderDeliveryStatus } = require('@prisma/client');

const service = new EventRelationService();
test('duplicate reminders are rejected while ALERT/PUSH at the same time are allowed', () => {
  assert.throws(() => service.normalizeReminders([
    { method: 'ALERT', minutesBefore: 60 }, { method: 'ALERT', minutesBefore: 60 },
  ]), /already exists/i);
  assert.equal(service.normalizeReminders([
    { method: 'ALERT', minutesBefore: 60 }, { method: 'PUSH', minutesBefore: 60 },
  ]).length, 2);
});

function fixture(startAt) {
  const existing = { id: 'sent', method: 'ALERT', minutesBefore: 10, scheduledAt: new Date(startAt - 600000), deliveryStatus: 'DISPATCHED' };
  const writes = { created: [], updated: [], removed: [] };
  const tx = { reminder: {
    findMany: async () => [existing],
    createMany: async ({ data }) => writes.created.push(...data),
    update: async input => writes.updated.push(input),
    deleteMany: async input => writes.removed.push(input),
  } };
  return { tx, writes, target: { id: 'event', startAt: new Date(startAt), reminders: [existing] } };
}

test('saving unchanged reminders preserves the sent row and status', async () => {
  const { tx, writes, target } = fixture(Date.now() + 3600000);
  await service.replaceReminders(tx, target, target.startAt, [{ method: 'ALERT', minutesBefore: 10 }]);
  assert.deepEqual(writes, { created: [], updated: [], removed: [] });
});

test('adding a past offset skips it while a future offset remains pending', async () => {
  const { tx, writes, target } = fixture(Date.now() + 300000);
  await service.replaceReminders(tx, target, target.startAt, [
    { method: 'ALERT', minutesBefore: 10 },
    { method: 'PUSH', minutesBefore: 30 },
    { method: 'ALERT', minutesBefore: 0 },
  ]);
  assert.equal(writes.updated.length, 0);
  assert.equal(writes.created.find(r => r.minutesBefore === 30).deliveryStatus, ReminderDeliveryStatus.CANCELLED);
  assert.equal(writes.created.find(r => r.minutesBefore === 0).deliveryStatus, ReminderDeliveryStatus.PENDING);
});

test('rescheduling a sent reminder resets only for the new future schedule', async () => {
  const { tx, writes, target } = fixture(Date.now() - 3600000);
  await service.replaceReminders(tx, target, new Date(Date.now() + 3600000));
  assert.equal(writes.updated.length, 1);
  assert.equal(writes.updated[0].where.id, 'sent');
  assert.equal(writes.updated[0].data.deliveryStatus, 'PENDING');
  assert.equal(writes.updated[0].data.attemptCount, 0);
});

test('dispatch retries retain grouping while a changed start time uses a new group', async () => {
  const { ReminderDispatchService } = require('../dist/modules/reminder-dispatch/reminder-dispatch.service');
  const { of } = require('rxjs');
  const emitted = [];
  const reminder = { id: 'reminder', scheduledAt: new Date('2030-01-01T09:50:00Z'), method: 'ALERT', minutesBefore: 10, deliveryStatus: 'PENDING', attemptCount: 0,
    event: { id: 'event', title: 'Task', startAt: new Date('2030-01-01T10:00:00Z'), endAt: new Date('2030-01-01T11:00:00Z'), calendar: { name: 'Personal', timeZone: 'UTC' }, recurrenceSeries: null, attendees: [{ userId: 'user' }], description: 'Description', allDay: false, sourceType: 'TASK' } };
  const dispatch = new ReminderDispatchService({ reminder: { updateMany: async () => ({ count: 1 }), update: async () => {} }, userProfileSnapshot: { findMany: async () => [] } }, { emit: (_topic, payload) => { emitted.push(payload); return of(undefined); } });
  await dispatch.dispatchOne(reminder);
  await dispatch.dispatchOne({ ...reminder, method: 'PUSH' });
  assert.equal(emitted[0].groupKey, emitted[1].groupKey);
  assert.equal(emitted[0].event.description, 'Description');
  reminder.event.startAt = new Date('2030-01-01T12:00:00Z');
  reminder.scheduledAt = new Date('2030-01-01T11:50:00Z');
  await dispatch.dispatchOne(reminder);
  assert.notEqual(emitted[0].groupKey, emitted[2].groupKey);
});

const databaseUrl = process.env.REMINDER_TEST_DATABASE_URL;
test('PostgreSQL reminder edits retain delivered records and schedule only new future offsets', { skip: !databaseUrl }, async t => {
  assert.equal(new URL(databaseUrl).pathname, '/reminder_verification');
  const { PrismaClient } = require('@prisma/client');
  const { randomUUID } = require('node:crypto');
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  t.after(() => prisma.$disconnect());
  const calendar = await prisma.calendar.create({ data: { name: 'Reminder verification', color: '#22396F', ownerUserId: randomUUID() } });
  const startAt = new Date(Date.now() + 300000);
  const event = await prisma.calendarEvent.create({ data: { calendarId: calendar.id, createdBy: calendar.ownerUserId, title: 'Task', sourceType: 'TASK', startAt, endAt: new Date(startAt.getTime() + 3600000) } });
  t.after(() => prisma.calendar.delete({ where: { id: calendar.id } }));
  const sent = await prisma.reminder.create({ data: { eventId: event.id, method: 'ALERT', minutesBefore: 10, scheduledAt: new Date(startAt.getTime() - 600000), deliveryStatus: 'DISPATCHED', dispatchedAt: new Date() } });
  await prisma.$transaction(tx => service.replaceReminders(tx, { ...event, reminders: [sent] }, startAt, [
    { method: 'ALERT', minutesBefore: 10 }, { method: 'PUSH', minutesBefore: 30 }, { method: 'ALERT', minutesBefore: 0 },
  ]));
  let reminders = await prisma.reminder.findMany({ where: { eventId: event.id } });
  assert.equal(reminders.find(r => r.id === sent.id).deliveryStatus, 'DISPATCHED');
  assert.equal(reminders.find(r => r.method === 'PUSH').deliveryStatus, 'CANCELLED');
  assert.equal(reminders.find(r => r.minutesBefore === 0).deliveryStatus, 'PENDING');
  await assert.rejects(prisma.reminder.create({ data: { eventId: event.id, method: 'ALERT', minutesBefore: 0, scheduledAt: startAt } }), error => error.code === 'P2002');
  const newStart = new Date(Date.now() + 7200000);
  await prisma.$transaction(tx => service.replaceReminders(tx, { ...event, reminders }, newStart));
  reminders = await prisma.reminder.findMany({ where: { eventId: event.id } });
  assert.ok(reminders.every(r => r.deliveryStatus === 'PENDING'));
  assert.ok(reminders.some(r => r.id === sent.id));
  const { ReminderDispatchService } = require('../dist/modules/reminder-dispatch/reminder-dispatch.service');
  const { from } = require('rxjs');
  const include = { event: { include: { attendees: true, calendar: true, recurrenceSeries: true } } };
  const old = await prisma.reminder.findUnique({ where: { id: sent.id }, include });
  const laterStart = new Date(newStart.getTime() + 3600000);
  let published = false;
  const dispatch = new ReminderDispatchService(prisma, { emit: () => from((async () => {
    published = true;
    await prisma.$transaction(async tx => {
      await tx.calendarEvent.update({ where: { id: event.id }, data: { startAt: laterStart, endAt: new Date(laterStart.getTime() + 3600000) } });
      await service.replaceReminders(tx, { ...event, startAt: newStart, reminders }, laterStart);
    });
  })()) });
  // Align the actual parent with the prior reminder schedule before taking its snapshot.
  await prisma.calendarEvent.update({ where: { id: event.id }, data: { startAt: newStart, endAt: new Date(newStart.getTime() + 3600000) } });
  old.event.startAt = newStart;
  await dispatch.dispatchOne(old);
  assert.equal(published, true);
  const afterConcurrentEdit = await prisma.reminder.findUnique({ where: { id: sent.id } });
  assert.equal(afterConcurrentEdit.deliveryStatus, 'PENDING', 'Old delivery must not mark the rescheduled reminder as sent');
  assert.equal(afterConcurrentEdit.scheduledAt.getTime(), laterStart.getTime() - 600000);
});
