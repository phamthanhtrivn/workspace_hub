/* eslint-disable @typescript-eslint/require-await -- Test doubles implement asynchronous integration contracts. */
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MeetingRecordingService } from './meeting-recording.service';

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
