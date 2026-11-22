import assert from 'node:assert/strict';
import { test } from 'node:test';
import { taskSyncDueDate } from './task-sync.types';

test('shared task cards preserve civil dates for all-day deadlines and UTC instants for timed deadlines', () => {
  const dueDate = new Date('2026-11-22T00:00:00Z');
  assert.equal(taskSyncDueDate({ dueDate, allDay: true }), '2026-11-22');
  assert.equal(taskSyncDueDate({ dueDate, allDay: false }), '2026-11-22T00:00:00.000Z');
  assert.equal(taskSyncDueDate({ dueDate: null, allDay: true }), null);
});
