import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { parseUserEvent, type UserEventEnvelope } from './user-event-policy';
import { kafkaConsumerState, KAFKA_CONSUMER_HEARTBEAT_STALE_MS } from './consumer-lifecycle';

const event: UserEventEnvelope = { userId: '00000000-0000-4000-8000-000000000001', eventId: '00000000-0000-4000-8000-000000000002', schemaVersion: 1, revision: '9007199254740993', occurredAt: '2026-11-05T00:00:00Z' };
test('user event revisions remain lossless and malformed envelopes cannot enter retry loops', () => {
  assert.equal(parseUserEvent(event).revision, 9007199254740993n);
  for (const overrides of [{ userId: 'invalid' }, { occurredAt: 'invalid' }, { revision: '-1' }, { revision: '9223372036854775808' }, { schemaVersion: 2 }, { eventId: 'invalid' }, { revision: undefined }])
    assert.throws(() => parseUserEvent({ ...event, ...overrides }));
  assert.equal(parseUserEvent({ userId: event.userId, occurredAt: event.occurredAt }).revision, 0n);
});

test('readiness requires a joined healthy consumer with fresh heartbeats', () => {
  try {
    kafkaConsumerState.reset();
    assert.equal(kafkaConsumerState.ready(), false);
    kafkaConsumerState.joined = true;
    kafkaConsumerState.lastHeartbeat = Date.now();
    kafkaConsumerState.handlingFailed = false;
    assert.equal(kafkaConsumerState.ready(), true);
    kafkaConsumerState.handlingFailed = true;
    assert.equal(kafkaConsumerState.ready(), false);
    kafkaConsumerState.handlingFailed = false;
    kafkaConsumerState.lastHeartbeat = Date.now() - KAFKA_CONSUMER_HEARTBEAT_STALE_MS - 1;
    assert.equal(kafkaConsumerState.ready(), false);
  } finally { kafkaConsumerState.reset(); kafkaConsumerState.handlingFailed = false; }
});

test('a successful partition cannot hide another partition waiting for retry', () => {
  try {
    kafkaConsumerState.reset();
    kafkaConsumerState.joined = true;
    kafkaConsumerState.lastHeartbeat = Date.now();
    kafkaConsumerState.recordHandlingResult('profile', 0, true);
    kafkaConsumerState.recordHandlingResult('profile', 1, false);
    kafkaConsumerState.recordHandlingResult('task', 0, false);
    assert.equal(kafkaConsumerState.ready(), false);
    kafkaConsumerState.recordHandlingResult('profile', 0, false);
    assert.equal(kafkaConsumerState.ready(), true);
    kafkaConsumerState.recordHandlingResult('profile', 0, true);
    kafkaConsumerState.reset();
    kafkaConsumerState.joined = true;
    kafkaConsumerState.lastHeartbeat = Date.now();
    assert.equal(kafkaConsumerState.ready(), true, 'revoked assignments cannot leave a stale failure');
  } finally { kafkaConsumerState.reset(); }
});
