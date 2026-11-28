/* eslint-disable @typescript-eslint/require-await -- Test doubles implement asynchronous integration contracts. */
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EgressInfo, EgressStatus } from 'livekit-server-sdk';
import { MeetingRecordingWorker } from './meeting-recording.worker';

function fixture() {
  const recording = {
    id: 'recording',
    meetingId: 'meeting',
    ownerId: 'owner',
    startedBy: 'owner',
    status: 'STARTING',
    layout: 'grid',
    s3Key: 'recordings/test.mp4',
    fileName: 'test.mp4',
    segmentKey: null,
    livekitEgressId: null,
    version: 0,
    egressUpdatedAt: 0n,
    requestedAt: new Date(),
    stopRequestedAt: null as Date | null,
    failureCode: null,
    meeting: { roomName: 'test-room', status: 'LIVE' },
    permissions: [],
  };
  let updates = 0,
    starts = 0,
    stops = 0,
    claimed = false;
  const job = {
    id: 'job',
    recordingId: recording.id,
    kind: 'START',
    state: 'PENDING',
    attempts: 0,
    dispatchedAt: null as Date | null,
  };
  const prisma = {
    meetingRecording: {
      findMany: async () => [{ ...recording }],
      findUnique: async () => recording,
      findFirst: async () => recording,
      findUniqueOrThrow: async () => recording,
      updateMany: async ({
        data,
        where,
      }: {
        data: Record<string, unknown>;
        where?: { status?: unknown };
      }) => {
        if (
          typeof where?.status === 'string' &&
          recording.status !== where.status
        )
          return { count: 0 };
        updates++;
        const version = recording.version + 1;
        Object.assign(recording, data, { version });

        return { count: 1 };
      },
    },
    meetingRecordingJob: {
      findUnique: async () => job,
      findUniqueOrThrow: async () => ({ ...job }),
      upsert: async () => job,
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        if (data.state === 'RUNNING') {
          if (claimed) return { count: 0 };
          claimed = true;
          job.attempts++;
        }
        if (data.dispatchedAt) job.dispatchedAt = data.dispatchedAt as Date;

        return { count: 1 };
      },
    },
    meetingParticipant: {
      findUnique: async () => ({
        role: 'HOST',
        status: 'JOINED',
        canRecord: true,
      }),
    },
  };
  const liveKit = {
    createRoomServiceClient: () => ({
      getParticipant: async () => ({ tracks: [] }),
    }),
    listRecordings: async () => [] as EgressInfo[],
    recordingReadiness: async () => ({ ready: true }),
    stopRecording: async () => {
      stops++;

      return new EgressInfo();
    },
    startRecording: async () => {
      starts++;

      return new EgressInfo();
    },
  };
  const s3 = { getFileSize: async () => 1024n };
  const worker = new MeetingRecordingWorker(
    prisma as never,
    liveKit as never,
    s3 as never,
    { emitMeetingEvent() {}, emitUserEvent() {} } as never,
    {} as never,
  );
  const control = worker as unknown as {
    startJob: (
      recording: unknown,
      job: unknown,
      lease: string,
    ) => Promise<void>;
    runJob: (job: unknown) => Promise<void>;
    stopJob: (recording: unknown) => Promise<void>;
    reconcile: () => Promise<void>;
  };

  return {
    recording,
    job,
    liveKit,
    s3,
    worker,
    control,
    counts: () => ({ updates, starts, stops }),
  };
}

function completion() {
  return new EgressInfo({
    egressId: 'egress',
    roomName: 'test-room',
    status: EgressStatus.EGRESS_COMPLETE,
    updatedAt: 3000000000n,
    endedAt: 3000000000n,
    fileResults: [
      { filename: 'recordings/test.mp4', size: 1024n, duration: 2000000000n },
    ],
  });
}

void test('completion is idempotent and late active events do not reopen a completed recording', async () => {
  const f = fixture();
  await f.worker.applyEgress(completion());
  assert.equal(f.recording.status, 'COMPLETED');
  await f.worker.applyEgress(completion());
  await f.worker.applyEgress(
    new EgressInfo({
      egressId: 'egress',
      roomName: 'test-room',
      status: EgressStatus.EGRESS_ACTIVE,
      updatedAt: 1000000000n,
    }),
  );
  assert.equal(f.counts().updates, 1);
  assert.equal(f.recording.status, 'COMPLETED');
});

void test('an unverified upload stays processing and can be verified by a later reconciliation', async () => {
  const f = fixture();
  f.s3.getFileSize = async () => {
    throw new Error('temporary S3 failure');
  };
  await f.worker.applyEgress(completion());
  assert.equal(f.recording.status, 'PROCESSING');
  assert.equal(f.recording.failureCode, 'VERIFYING_UPLOAD');
  f.s3.getFileSize = async () => 1024n;
  await f.worker.applyEgress(completion());
  assert.equal(f.recording.status, 'COMPLETED');
});

void test('stop during startup never fabricates a completed file', async () => {
  const f = fixture();
  f.recording.stopRequestedAt = new Date();
  await f.control.startJob(f.recording, f.job, 'lease');
  assert.equal(f.recording.status, 'FAILED');
  assert.equal(f.recording.failureCode, 'START_CANCELLED');
  assert.equal(f.counts().starts, 0);
});

void test('an uncertain START is reconciled and never dispatched a second time', async () => {
  const f = fixture();
  f.job.dispatchedAt = new Date();
  await assert.rejects(
    f.control.startJob(f.recording, f.job, 'lease'),
    /reconcile/,
  );
  assert.equal(f.counts().starts, 0);
});

void test('claim reloads the dispatch checkpoint and concurrent workers do not dispatch a stale START', async () => {
  const f = fixture();
  const stale = { ...f.job };
  f.job.dispatchedAt = new Date();
  await Promise.all([f.control.runJob(stale), f.control.runJob(stale)]);
  assert.equal(f.counts().starts, 0);
});

void test('dependency wait before dispatch is bounded and does not overwrite old failed recordings', async () => {
  const f = fixture();
  f.liveKit.recordingReadiness = async () => ({ ready: false });
  await assert.rejects(f.control.startJob(f.recording, f.job, 'lease'));
  f.recording.requestedAt = new Date(Date.now() - 11 * 60_000);
  await f.control.startJob(f.recording, f.job, 'lease');
  assert.equal(f.recording.failureCode, 'RECORDING_UNAVAILABLE');
  assert.equal(f.counts().starts, 0);
  await f.worker.applyEgress(completion());
  assert.equal(f.recording.status, 'FAILED');
});

void test('resuming an older recording gets a fresh startup deadline', async () => {
  const f = fixture();
  f.recording.requestedAt = new Date(Date.now() - 60 * 60_000);
  Object.assign(f.recording, { segmentIndex: 1, updatedAt: new Date() });
  f.liveKit.recordingReadiness = async () => ({ ready: false });
  await assert.rejects(f.control.startJob(f.recording, f.job, 'lease'));
  assert.equal(f.recording.status, 'STARTING');
});

void test('a capture track lost before dispatch ends startup without creating an Egress', async () => {
  const f = fixture();
  f.recording.layout = 'app:TR_synthetic';
  await f.control.startJob(f.recording, f.job, 'lease');
  assert.equal(f.recording.failureCode, 'RECORDING_CAPTURE_LOST');
  assert.equal(f.counts().starts, 0);
});

void test('accepted Egress without a template start signal has a bounded startup deadline', async () => {
  const f = fixture();
  Object.assign(f.recording, {
    updatedAt: new Date(),
    livekitEgressId: 'egress',
  });
  f.job.dispatchedAt = new Date(Date.now() - 11 * 60_000);
  await f.control.reconcile();
  assert.equal(f.recording.status, 'FAILED');
  assert.equal(f.recording.failureCode, 'START_UNCONFIRMED');
});

void test('a late ACTIVE event wins over the startup timeout checked from an old snapshot', async () => {
  const f = fixture();
  Object.assign(f.recording, {
    updatedAt: new Date(),
    livekitEgressId: 'egress',
  });
  f.job.dispatchedAt = new Date(Date.now() - 11 * 60_000);
  f.liveKit.listRecordings = async () => [
    new EgressInfo({
      egressId: 'egress',
      roomName: 'test-room',
      status: EgressStatus.EGRESS_ACTIVE,
      updatedAt: 1000000000n,
    }),
  ];
  await f.control.reconcile();
  assert.equal(f.recording.status, 'RECORDING');
  assert.equal(f.recording.failureCode, null);
});
