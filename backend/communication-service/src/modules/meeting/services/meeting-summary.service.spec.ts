/* eslint-disable @typescript-eslint/require-await -- Test doubles implement asynchronous integration contracts. */
import 'reflect-metadata';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { MeetingSummaryService } from './meeting-summary.service';

const originalFetch = global.fetch;
const originalEnabled = process.env.MEETING_SUMMARY_ENABLED;
const originalKey = process.env.COMMUNICATION_TO_AI_KEY;
afterEach(() => {
  global.fetch = originalFetch;
  if (originalEnabled === undefined) delete process.env.MEETING_SUMMARY_ENABLED;
  else process.env.MEETING_SUMMARY_ENABLED = originalEnabled;
  if (originalKey === undefined) delete process.env.COMMUNICATION_TO_AI_KEY;
  else process.env.COMMUNICATION_TO_AI_KEY = originalKey;
});

function fixture() {
  process.env.MEETING_SUMMARY_ENABLED = 'true';
  process.env.COMMUNICATION_TO_AI_KEY = 'x'.repeat(32);
  const recordings = {
    detail: async () => ({
      ownerId: 'owner',
      status: 'COMPLETED',
    }),
    summarySource: async (_id: string, user: string) => {
      if (user !== 'owner') throw new ForbiddenException();
    },
  };

  return {
    recordings,
    service: new MeetingSummaryService(recordings as never),
  };
}

void test('disabled summaries have a visible typed state and never call AI', async () => {
  const { service } = fixture();
  process.env.MEETING_SUMMARY_ENABLED = 'false';
  global.fetch = async () => {
    throw new Error('must not call AI');
  };
  assert.equal(
    (await service.get('recording', 'owner')).data.availability,
    'DISABLED',
  );
  await assert.rejects(service.start('recording', 'owner'));
});

void test('status is read-only and only the completed recording owner can create', async () => {
  const { service, recordings } = fixture();
  const calls: string[] = [];
  global.fetch = async (url) => {
    calls.push(String(url));

    return Response.json({ status: 'NOT_CREATED' });
  };
  assert.equal((await service.get('recording', 'owner')).data.canCreate, true);
  assert.equal(
    (await service.get('recording', 'shared')).data.canCreate,
    false,
  );
  assert.ok(calls.every((url) => url.endsWith('/status')));
  await assert.rejects(
    service.start('recording', 'shared'),
    ForbiddenException,
  );
  assert.equal(calls.length, 2);
  recordings.detail = async () => ({ ownerId: 'owner', status: 'PROCESSING' });
  assert.equal((await service.get('recording', 'owner')).data.canCreate, false);
});

void test('unavailable or malformed AI responses fail closed without hiding the section', async () => {
  const { service } = fixture();
  for (const response of [
    new Response('', { status: 503 }),
    Response.json({ status: 'invalid' }),
  ]) {
    global.fetch = async () => response;
    const result = (await service.get('recording', 'owner')).data;
    assert.equal(result.availability, 'UNAVAILABLE');
    assert.equal(result.canCreate, false);
  }
});

void test('access is rechecked after AI replies and dependency failures do not leak revoked data', async () => {
  const { service, recordings } = fixture();
  let checks = 0;
  recordings.detail = async () => {
    if (++checks > 1) throw new ForbiddenException();

    return { ownerId: 'owner', status: 'COMPLETED' };
  };
  global.fetch = async () =>
    Response.json({ status: 'COMPLETED', content: 'private summary' });
  await assert.rejects(service.get('recording', 'shared'), ForbiddenException);
});

void test('saved summaries remain readable when new processing is unavailable', async () => {
  const { service } = fixture();
  global.fetch = async () =>
    Response.json({
      status: 'COMPLETED',
      content: 'Saved result',
      available: false,
    });
  const result = (await service.get('recording', 'owner')).data;
  assert.equal(result.content, 'Saved result');
  assert.equal(result.canCreate, false);
});
