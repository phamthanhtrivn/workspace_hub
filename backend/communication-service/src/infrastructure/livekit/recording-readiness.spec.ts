/* eslint-disable @typescript-eslint/require-await -- Test doubles implement asynchronous integration contracts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RecordingReadinessProbe } from './recording-readiness';

void test('LiveKit configuration alone cannot make recording ready', async () => {
  let calls = 0;
  const probe = new RecordingReadinessProbe(async () => {
    calls++;

    return new Response('ok');
  });
  assert.equal((await probe.check(true, '')).ready, false);
  assert.equal((await probe.check(false, 'http://egress/')).ready, false);
  assert.equal(calls, 0);
});

void test('an unavailable egress fails closed and concurrent probes share a short cache', async () => {
  let calls = 0;
  let now = 0;
  const probe = new RecordingReadinessProbe(
    async () => {
      calls++;

      return new Response('', { status: 503 });
    },
    () => now,
  );
  const results = await Promise.all([
    probe.check(true, 'http://egress/'),
    probe.check(true, 'http://egress/'),
  ]);
  assert.ok(results.every((result) => !result.ready));
  assert.equal(calls, 1);
  now = 6000;
  await probe.check(true, 'http://egress/');
  assert.equal(calls, 2);
});

void test('readiness recovers and network errors do not expose provider details', async () => {
  const probe = new RecordingReadinessProbe(async () => {
    throw new Error('secret provider details');
  });
  assert.deepEqual(await probe.check(true, 'http://egress/'), {
    ready: false,
    code: 'RECORDING_UNAVAILABLE',
    reason: 'Recording service is unavailable. Please try again shortly.',
  });
  const healthy = new RecordingReadinessProbe(async () => new Response('ok'));
  assert.equal((await healthy.check(true, 'http://egress/')).ready, true);
});
