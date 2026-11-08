import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { until } from '../support.mjs';
import { holdProvider } from './helpers.mjs';

export function registerAITests(h) {
  const run = async (recording, status = 'COMPLETED') => {
    const response = await h.request(`/recordings/${recording.id}/summary`, {
      method: 'POST',
      body: {},
      status: 201,
    });
    assert.ok(
      ['QUEUED', 'RUNNING', 'COMPLETED'].includes(response.payload.status),
    );
    await until(
      async () => (await h.ai.service.status(recording.id)).status === status,
      `real summary worker reaches ${status}`,
      15000,
    );
    return h.ai.service.status(recording.id);
  };
  const realAI = async (operation) => {
    const previous = process.env.AI_SERVICE_URL;
    process.env.AI_SERVICE_URL = h.ai.url;
    try {
      return await operation();
    } finally {
      process.env.AI_SERVICE_URL = previous;
    }
  };

  test('AI-01: real summary API/queue/worker persist output; concurrent requests and later logins reuse it', async () =>
    realAI(async () => {
      const meeting = await h.instant(),
        recording = await h.readyRecording(meeting);
      const before = h.providers.calls.filter(
        (call) => call.path === '/transcribe',
      ).length;
      const start = () =>
        h.request(`/recordings/${recording.id}/summary`, {
          method: 'POST',
          body: {},
          status: 201,
        });
      await Promise.all([start(), start()]);
      await until(
        async () =>
          (await h.ai.service.status(recording.id)).status === 'COMPLETED',
        'summary persisted',
        15000,
      );
      assert.equal(
        h.providers.calls.filter((call) => call.path === '/transcribe').length -
          before,
        1,
      );
      const original = await h.ai.service.status(recording.id);
      assert.equal(original.transcribedChunks, 1);
      assert.ok(original.content);
      const persisted = await h.ai.database.db.query(
        'SELECT run_id,transcript_complete FROM notebook_ai.meeting_summaries WHERE recording_id=$1',
        [recording.id],
      );
      assert.equal(persisted.rows[0].transcript_complete, true);
      await h.request(`/recordings/${recording.id}/summary`, {
        actor: {
          token: h.sign({ ...h.actors.host.claims, jti: randomUUID() }),
        },
        method: 'POST',
        body: {},
        status: 201,
      });
      const reused = await h.ai.database.db.query(
        'SELECT run_id FROM notebook_ai.meeting_summaries WHERE recording_id=$1',
        [recording.id],
      );
      assert.equal(reused.rows[0].run_id, persisted.rows[0].run_id);
      assert.equal(
        h.providers.calls.filter((call) => call.path === '/transcribe').length -
          before,
        1,
      );
      await h.ai.assertScratchRemoved();
    }));

  test('AI-02: failed model call retains transcript; explicit retry reuses the checkpoint', async () =>
    realAI(async () => {
      const meeting = await h.instant(),
        recording = await h.readyRecording(meeting);
      const before = h.providers.calls.filter(
        (call) => call.path === '/transcribe',
      ).length;
      h.providers.failures.set('/v1/chat/completions', 503);
      await run(recording, 'FAILED');
      const failed = await h.ai.service.status(recording.id);
      assert.equal(failed.transcribedChunks, 1);
      assert.ok(failed.error);
      h.providers.failures.clear();
      await run(recording);
      assert.equal(
        h.providers.calls.filter((call) => call.path === '/transcribe').length -
          before,
        1,
      );
      await h.ai.assertScratchRemoved();
    }));

  test('AI-03: missing worker heartbeat prevents queuing; internal API rejects a foreign service key', async () =>
    realAI(async () => {
      const meeting = await h.instant(),
        recording = await h.readyRecording(meeting);
      await h.infrastructure.redis.del(
        'wh-notebook:meeting-summary-worker-heartbeat',
      );
      try {
        await h.request(`/recordings/${recording.id}/summary`, {
          method: 'POST',
          body: {},
          status: 503,
        });
      } finally {
        await h.infrastructure.redis.set(
          'wh-notebook:meeting-summary-worker-heartbeat',
          'ready:meeting-v1',
          'EX',
          600,
        );
      }
      const response = await fetch(
        `${h.ai.url}/internal/meeting-summaries/${recording.id}/status`,
        { method: 'POST', headers: { 'x-internal-service-key': 'wrong' } },
      );
      assert.equal(response.status, 401);
      await response.body?.cancel();
      assert.equal(
        (await h.ai.service.status(recording.id)).status,
        'NOT_CREATED',
      );
    }));

  test('AI-04: deleting a recording during model processing discards the result', async () =>
    realAI(async () => {
      const meeting = await h.instant(),
        recording = await h.readyRecording(meeting);
      await holdProvider(
        h,
        '/v1/chat/completions',
        () =>
          h.request(`/recordings/${recording.id}/summary`, {
            method: 'POST',
            body: {},
            status: 201,
          }),
        () =>
          h.request(`/recordings/${recording.id}`, {
            method: 'DELETE',
            status: 202,
          }),
      );
      await until(
        async () =>
          (await h.ai.service.status(recording.id)).status === 'FAILED',
        'deleted source aborts summary',
        15000,
      );
      const status = await h.ai.service.status(recording.id);
      assert.equal(status.content, null);
      await h.request(`/recordings/${recording.id}/summary`, { status: 404 });
      await h.ai.assertScratchRemoved();
    }));
}
