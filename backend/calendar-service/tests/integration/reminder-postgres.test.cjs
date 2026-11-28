const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventRelationService } = require('../../src/modules/calendar-event/event-relation.service');
const service = new EventRelationService();
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
  const { ReminderDispatchService } = require('../../src/modules/reminder-dispatch/reminder-dispatch.service');
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
