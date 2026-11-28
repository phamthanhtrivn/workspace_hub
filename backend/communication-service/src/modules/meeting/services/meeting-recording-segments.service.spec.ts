/* eslint-disable @typescript-eslint/require-await -- Test doubles implement asynchronous integration contracts. */
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MeetingRecordingSegmentsService,
  RecordingJobPending,
} from './meeting-recording-segments.service';

function fixture(count: number) {
  const recording = {
    id: 'recording',
    status: 'PROCESSING',
    failureCode: 'MERGE_PENDING',
    segmentIndex: count - 1,
    s3Key: 'recordings/final.mp4',
    version: 1,
  };
  const parts = Array.from({ length: count }, (_, index) => ({
    index,
    s3Key: `part-${index}`,
    sizeBytes: 1024n,
  }));
  let copies = 0,
    assemblies = 0,
    uploads = 0;
  const jobs: string[] = [];
  const prisma = {
    meetingRecordingSegment: { findMany: async () => parts },
    meetingRecordingJob: {
      updateMany: async () => ({ count: 1 }),
      upsert: async ({ create }: { create: { kind: string } }) => {
        jobs.push(create.kind);
      },
    },
    meetingRecording: {
      updateMany: async () => {
        recording.status = 'COMPLETED';

        return { count: 1 };
      },
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(prisma),
  };
  const s3 = {
    copyRecording: async () => {
      copies++;
    },
    uploadRecordingBackup: async () => {
      uploads++;

      return BigInt(count) * 1024n;
    },
    getFileSize: async () => BigInt(count) * 1024n,
  };
  const media = {
    assemble: async () => {
      assemblies++;

      return '/synthetic/recording.mp4';
    },
  };
  const service = new MeetingRecordingSegmentsService(
    prisma as never,
    s3 as never,
    media as never,
  );
  const merge = () =>
    service.merge(
      recording as never,
      { id: 'job' } as never,
      'lease',
      new AbortController().signal,
    );

  return {
    recording,
    parts,
    s3,
    media,
    merge,
    jobs,
    counts: () => ({ copies, assemblies, uploads }),
  };
}

void test('a single segment completes without FFmpeg and replay does not copy it again', async () => {
  const f = fixture(1);
  f.media.assemble = async () => {
    throw new Error('FFmpeg unavailable');
  };
  assert.equal(await f.merge(), true);
  assert.equal(f.recording.status, 'COMPLETED');
  assert.deepEqual(f.counts(), { copies: 1, assemblies: 0, uploads: 0 });
  assert.equal(await f.merge(), false);
  assert.equal(f.counts().copies, 1);
});

void test('multiple pause/resume segments are assembled and verified before completion', async () => {
  const f = fixture(2);
  assert.equal(await f.merge(), true);
  assert.deepEqual(f.counts(), { copies: 0, assemblies: 1, uploads: 1 });
  assert.equal(f.recording.status, 'COMPLETED');
  assert.deepEqual(f.jobs, ['NOTIFY', 'CLEANUP']);
});

void test('missing segments and invalid output never complete or enqueue cleanup', async () => {
  const missing = fixture(2);
  missing.parts.pop();
  await assert.rejects(missing.merge(), RecordingJobPending);
  assert.equal(missing.counts().uploads, 0);
  const invalid = fixture(1);
  invalid.s3.getFileSize = async () => 0n;
  await assert.rejects(invalid.merge(), /verification failed/);
  assert.equal(invalid.recording.status, 'PROCESSING');
  assert.deepEqual(invalid.jobs, []);
});
