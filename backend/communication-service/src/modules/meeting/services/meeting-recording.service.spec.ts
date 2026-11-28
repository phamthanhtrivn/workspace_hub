/* eslint-disable @typescript-eslint/require-await -- Test doubles implement asynchronous integration contracts. */
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MeetingRecordingService } from './meeting-recording.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListRecordingsDto } from '../dto/meeting-recording.dto';

function fixture() {
  let probes = 0,
    transactions = 0;
  const participant = { role: 'HOST', status: 'JOINED', canRecord: false };
  const prisma = {
    meetingRecording: { findFirst: async () => null },
    meetingRecordingJob: { findUnique: async () => null },
    $transaction: async () => {
      transactions++;
      throw new Error('must not mutate');
    },
  };
  const livekit = {
    recordingReadiness: async () => {
      probes++;

      return {
        ready: false,
        code: 'RECORDING_UNAVAILABLE',
        reason: 'Recorder unavailable',
      };
    },
  };
  const policy = {
    assertJoinedMeetingParticipant: async () => ({
      meeting: { id: 'meeting', createdBy: 'owner' },
      participant,
    }),
  };

  return {
    participant,
    service: new MeetingRecordingService(
      prisma as never,
      livekit as never,
      {} as never,
      policy as never,
      {} as never,
    ),
    counts: () => ({ probes, transactions }),
  };
}

void test('status and Start agree on Egress readiness and reject before creating a recording', async () => {
  const f = fixture();
  const state = await f.service.status('meeting', 'owner');
  assert.equal(state.recordingAvailable, false);
  assert.equal(state.capabilities.canStart, false);
  assert.equal(state.unavailableCode, 'RECORDING_UNAVAILABLE');
  await assert.rejects(
    f.service.start(
      'meeting',
      'owner',
      { layout: 'grid' },
      'valid-request-key',
    ),
    (error) => {
      assert.equal(
        (error as { getResponse(): { code: string } }).getResponse().code,
        'RECORDING_UNAVAILABLE',
      );

      return true;
    },
  );
  assert.equal(f.counts().transactions, 0);
});

void test('recording permission is checked before probing infrastructure on Start', async () => {
  const f = fixture();
  f.participant.role = 'PARTICIPANT';
  await assert.rejects(
    f.service.start(
      'meeting',
      'owner',
      { layout: 'grid' },
      'valid-request-key',
    ),
    (error) => {
      assert.equal((error as { getStatus(): number }).getStatus(), 403);

      return true;
    },
  );
  assert.equal(f.counts().probes, 0);
  assert.equal(f.counts().transactions, 0);
});

void test('date filters apply to recording dates before pagination without weakening shared access', async () => {
  const captured: Record<string, unknown>[] = [];
  const prisma = {
    meetingRecording: {
      count: async ({ where }: { where: Record<string, unknown> }) => {
        captured.push(where);

        return 13;
      },
      findMany: async (query: Record<string, unknown>) => {
        captured.push(query);

        return [];
      },
    },
    $transaction: async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
  };
  const service = new MeetingRecordingService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const page = await service.list('viewer', {
    scope: 'shared',
    page: 2,
    limit: 12,
    search: 'Demo',
    fromDate: '2026-11-14T00:00:00+07:00',
    toDate: '2026-11-15T00:00:00+07:00',
  });
  const where = captured[0];
  assert.deepEqual(where.requestedAt, {
    gte: new Date('2026-11-13T17:00:00Z'),
    lt: new Date('2026-11-14T17:00:00Z'),
  });
  assert.deepEqual(where.AND, [
    { ownerId: { not: 'viewer' }, permissions: { some: { userId: 'viewer' } } },
    { status: { not: 'DELETED' } },
  ]);
  assert.equal(captured[1].where, where);
  assert.equal(captured[1].skip, 12);
  assert.equal(captured[1].take, 12);
  assert.equal(page.totalPages, 2);
});

void test('invalid or reversed date bounds fail validation before querying recordings', async () => {
  const service = new MeetingRecordingService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  for (const range of [
    { fromDate: 'invalid' },
    { fromDate: '2026-11-15T00:00:00Z', toDate: '2026-11-14T00:00:00Z' },
  ])
    await assert.rejects(
      service.list('viewer', range),
      (error) => (error as { getStatus(): number }).getStatus() === 400,
    );
  const invalid = plainToInstance(ListRecordingsDto, {
    fromDate: '2026-02-30T00:00:00Z',
  });
  assert.ok(
    (await validate(invalid)).some((error) => error.property === 'fromDate'),
  );
});

void test('recording permission profiles include avatars and remain owner-only', async () => {
  let lookups = 0;
  const profile = {
    userId: 'viewer',
    email: 'viewer@example.test',
    fullName: 'Viewer',
    avatarUrl: 'private/avatar',
  };
  const prisma = {
    meetingRecording: {
      findUnique: async () => ({
        ownerId: 'owner',
        status: 'COMPLETED',
        permissions: [{ userId: 'viewer', canDownload: false }],
      }),
    },
    userProfileSnapshot: {
      findMany: async ({ select }: { select: { avatarUrl?: boolean } }) => {
        lookups++;
        assert.equal(select.avatarUrl, true);

        return [profile];
      },
    },
  };
  const service = new MeetingRecordingService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const permissions = await service.permissions('recording', 'owner');
  assert.equal(permissions[0].profile?.avatarUrl, profile.avatarUrl);
  await assert.rejects(
    service.permissions('recording', 'viewer'),
    (error) => (error as { getStatus(): number }).getStatus() === 403,
  );
  assert.equal(lookups, 1);
});
