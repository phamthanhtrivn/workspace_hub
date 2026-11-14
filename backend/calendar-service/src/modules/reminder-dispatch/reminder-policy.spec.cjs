const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventRelationService } = require('../calendar-event/event-relation.service');
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
  const { ReminderDispatchService } = require('./reminder-dispatch.service');
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
