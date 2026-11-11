const assert = require('node:assert/strict');
const { test } = require('node:test');
const { CalendarEventValidationService } = require('../dist/modules/calendar-event/calendar-event-validation.service');
const { RecurrenceTransactionService } = require('../dist/modules/calendar-event/recurrence-transaction.service');
const { CalendarConferenceSyncService } = require('../dist/modules/calendar-event/calendar-conference-sync.service');

const validation = new CalendarEventValidationService();

test('range rejects invalid dates and durations shorter than 15 minutes', () => {
  for (const end of ['invalid', '2026-01-01T08:00:00Z', '2026-01-01T09:14:59Z']) {
    assert.throws(() => validation.assertValidRange('2026-01-01T09:00:00Z', end));
  }
  assert.doesNotThrow(() => validation.assertValidRange('2020-01-01T09:00:00Z', '2020-01-01T09:15:00Z'));
});

test('deadline blocks creating a recurring task and adding it to an existing series', () => {
  const deadline = '[TASK]\n[Deadline: 2030-01-02 12:00]';
  assert.throws(() => validation.assertTaskDeadlineCompatibility(true, null, deadline, false, 'FREQ=DAILY'));
  assert.throws(() => validation.assertTaskDeadlineCompatibility(true, '[TASK]', deadline, true, undefined));
  assert.doesNotThrow(() => validation.assertTaskDeadlineCompatibility(true, deadline, '[TASK]', false, 'FREQ=DAILY'));
  assert.doesNotThrow(() => validation.assertTaskDeadlineCompatibility(true, null, deadline, false, null));
});

test('every update scope rejects recurrence/time edits while allowing title updates', async () => {
  const calls = [];
  const mutate = { updateSingleOccurrence: async () => { calls.push('THIS'); return 'event'; } };
  const service = new RecurrenceTransactionService({}, {}, mutate,
    { updateThisAndFollowing: async () => { calls.push('THIS_AND_FOLLOWING'); return 'event'; } },
    { updateEntireSeries: async () => { calls.push('ALL'); return 'event'; } }, {});
  const event = {
    startAt: new Date('2030-01-01T09:00:00Z'), endAt: new Date('2030-01-01T10:00:00Z'), allDay: false,
    recurrenceSeries: { recurrenceRule: 'FREQ=DAILY', timeZone: 'UTC', exceptions: [] },
  };
  for (const recurrenceScope of ['THIS', 'THIS_AND_FOLLOWING', 'ALL']) {
    for (const change of [
      { recurrenceRule: null }, { recurrenceRule: 'FREQ=WEEKLY' },
      { startAt: '2030-01-02T09:00:00Z' }, { endAt: '2030-01-01T11:00:00Z' },
      { allDay: true }, { exceptionDates: ['2030-01-02T09:00:00Z'] },
    ]) {
      await assert.rejects(service.updateRecurringEventInTransaction('user', event, { timeZone: 'UTC' }, { recurrenceScope, ...change }, {}));
    }
    assert.equal(await service.updateRecurringEventInTransaction('user', event, { timeZone: 'UTC' }, { recurrenceScope, title: 'Updated' }, {}), 'event');
  }
  assert.deepEqual(calls, ['THIS', 'THIS_AND_FOLLOWING', 'ALL']);
});

test('meeting reconciliation skips past occurrences, schedules future slots separately and retains history', async () => {
  const now = Date.now();
  const events = ['past', 'future-1', 'future-2', 'history'].map((id, index) => ({
    id, createdBy: 'host', conferenceEnabled: true, status: 'CONFIRMED', title: id,
    description: null, startAt: new Date(now + (index === 1 || index === 2 ? index * 86400000 : -86400000)),
    endAt: new Date(now + (index === 1 || index === 2 ? index * 86400000 : -86400000) + 3600000), attendees: [],
  }));
  const writes = [];
  const tx = {
    $queryRaw: async () => [],
    calendarEvent: { findMany: async () => events },
    calendarConference: {
      findMany: async () => [{ eventId: 'history', meetingId: 'meeting', payload: {}, enabled: true }],
      upsert: async input => writes.push(input),
    },
  };
  await new CalendarConferenceSyncService({}).reconcileCalendar(tx, 'calendar');
  assert.equal(writes.find(write => write.where.eventId === 'past').create.enabled, false);
  for (const id of ['future-1', 'future-2', 'history']) {
    assert.equal(writes.find(write => write.where.eventId === id).create.enabled, true);
  }
  assert.notEqual(writes[1].create.payload.eventId, writes[2].create.payload.eventId);
});

test('deletion still supports single, following and entire series', async () => {
  const calls = [];
  const occurrences = {
    cancelOccurrencesInTransaction: async (...args) => calls.push(args),
    getSeriesOccurrenceIds: async (_id, _tx, cutoff) => cutoff ? ['selected', 'next'] : ['first', 'selected', 'next'],
  };
  const service = new RecurrenceTransactionService({}, { truncateBefore: () => 'FREQ=DAILY;UNTIL=20300101T085959Z' }, {}, {}, {}, occurrences);
  const event = { id: 'selected', startAt: new Date('2030-01-01T09:00:00Z'), recurrenceSeries: { id: 'series', recurrenceRule: 'FREQ=DAILY', timeZone: 'UTC' } };
  const tx = { recurrenceSeries: { update: async () => {} } };
  for (const scope of ['THIS', 'THIS_AND_FOLLOWING', 'ALL']) await service.cancelEventInTransaction('user', event, scope, tx);
  assert.deepEqual(calls.map(args => args[2]), [['selected'], ['selected', 'next'], ['first', 'selected', 'next']]);
});

test('expired meeting jobs stop without calling the meeting API', async () => {
  const writes = [];
  const service = new CalendarConferenceSyncService({
    calendar: { findMany: async () => [] },
    calendarConference: {
      findMany: async query => query.take ? [{ eventId: 'expired', revision: 1n, enabled: true, meetingId: null, nextAttemptAt: new Date(), payload: { scheduledStartAt: '2000-01-01T09:00:00Z' } }] : [],
      updateMany: async input => { writes.push(input); return { count: 1 }; },
    },
  });
  await service.drain();
  assert.equal(writes.at(-1).data.status, 'NONE');
  assert.equal(writes.at(-1).data.enabled, false);
  assert.equal(writes.at(-1).data.lastError, null);
});
