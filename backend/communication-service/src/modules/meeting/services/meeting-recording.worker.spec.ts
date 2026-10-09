jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('livekit-server-sdk', () => ({
  ...jest.requireActual<object>('@livekit/protocol'),
}));

import { EgressInfo, EgressStatus, FileInfo } from '@livekit/protocol';
import { MeetingRecordingWorker } from './meeting-recording.worker';
import { egressDate } from '../utils/meeting-recording.utils';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import type { S3Service } from '../../../infrastructure/s3/s3.service';
import type { MeetingRealtimeService } from './meeting-realtime.service';
import type { ClientKafka } from '@nestjs/microservices';

describe('durable recording commands', () => {
  const recording = {
    id: 'recording',
    meetingId: 'meeting',
    ownerId: 'owner',
    startedBy: 'owner',
    meeting: { roomName: 'room', status: 'LIVE' },
    permissions: [],
    status: 'STARTING',
    s3Key: 'recordings/meeting/recording.mp4',
    livekitEgressId: null,
  };
  const job = {
    id: 'job',
    recordingId: 'recording',
    kind: 'START',
    attempts: 1,
    dispatchedAt: new Date(),
  };
  const egress = new EgressInfo({
    egressId: 'EG_1',
    roomName: 'room',
    status: EgressStatus.EGRESS_ACTIVE,
  });
  let update: jest.Mock;
  let list: jest.Mock;
  let start: jest.Mock;
  let stop: jest.Mock;
  let find: jest.Mock;
  let worker: MeetingRecordingWorker;
  beforeEach(() => {
    update = jest.fn().mockResolvedValue({ count: 1 });
    list = jest.fn().mockResolvedValue([]);
    start = jest.fn();
    stop = jest
      .fn()
      .mockResolvedValue(
        new EgressInfo({ ...egress, status: EgressStatus.EGRESS_ENDING }),
      );
    find = jest.fn().mockResolvedValue(recording);
    worker = new MeetingRecordingWorker(
      {
        meetingRecording: {
          findMany: jest.fn().mockResolvedValue([]),
          findUniqueOrThrow: find,
          findUnique: find,
        },
        meetingRecordingJob: {
          findMany: jest.fn().mockResolvedValue([job]),
          updateMany: update,
        },
      } as unknown as PrismaService,
      {
        isRecordingConfigured: () => true,
        listRecordings: list,
        startRecording: start,
        stopRecording: stop,
      } as unknown as LiveKitService,
      {} as S3Service,
      {} as MeetingRealtimeService,
      {} as ClientKafka,
    );
  });
  it('reconciles an uncertain start instead of dispatching a duplicate', async () => {
    await worker.tick();
    expect(list).toHaveBeenCalledWith('room');
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state: 'PENDING' }) as unknown,
      }),
    );
  });
  it('does not dispatch after another worker has claimed the command', async () => {
    update.mockResolvedValue({ count: 0 });
    await worker.tick();
    expect(list).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });
  it('cleans up an active egress even after the recording has failed', async () => {
    Object.assign(job, { kind: 'STOP' });
    find.mockResolvedValue({
      ...recording,
      status: 'FAILED',
      livekitEgressId: 'EG_1',
    });
    list.mockResolvedValue([egress]);
    await worker.tick();
    expect(stop).toHaveBeenCalledWith('EG_1');
    Object.assign(job, { kind: 'START' });
  });
  it('accepts a completed stop without stopping an already completed egress', async () => {
    Object.assign(job, { kind: 'STOP' });
    find.mockResolvedValue({
      ...recording,
      status: 'COMPLETED',
      livekitEgressId: 'EG_1',
    });
    list.mockResolvedValue([
      new EgressInfo({ ...egress, status: EgressStatus.EGRESS_COMPLETE }),
    ]);
    await worker.tick();
    expect(stop).not.toHaveBeenCalled();
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state: 'DONE' }) as unknown,
      }),
    );
    Object.assign(job, { kind: 'START' });
  });
});

describe('recording egress lifecycle', () => {
  let worker: MeetingRecordingWorker;
  let update: jest.Mock;
  let find: jest.Mock;
  let size: jest.Mock;
  let stop: jest.Mock;
  const stored = {
    id: 'recording',
    meetingId: 'meeting',
    meeting: { roomName: 'room' },
    status: 'RECORDING',
    version: 3,
    livekitEgressId: 'EG_1',
    s3Key: 'recordings/meeting/recording.mp4',
    egressUpdatedAt: 2n,
    stopRequestedAt: null,
  };
  const info = () =>
    new EgressInfo({
      egressId: 'EG_1',
      roomName: 'room',
      status: EgressStatus.EGRESS_COMPLETE,
      updatedAt: 3n,
      startedAt: 1_700_000_000_000_000_000n,
      endedAt: 1_700_000_065_000_000_000n,
      fileResults: [
        new FileInfo({
          filename: stored.s3Key,
          size: 5_000_000_000n,
          duration: 65_000_000_000n,
        }),
      ],
    });

  beforeEach(() => {
    find = jest.fn().mockResolvedValue(stored);
    update = jest.fn().mockResolvedValue({ count: 0 });
    size = jest.fn().mockResolvedValue(5_000_000_000n);
    stop = jest.fn();
    worker = new MeetingRecordingWorker(
      {
        meetingRecording: { findUnique: find, updateMany: update },
      } as unknown as PrismaService,
      { stopRecording: stop } as unknown as LiveKitService,
      { getFileSize: size } as unknown as S3Service,
      {} as MeetingRealtimeService,
      {} as ClientKafka,
    );
  });
  it('converts nanosecond timestamps without treating them as milliseconds', () => {
    expect(egressDate(1_700_000_000_000_000_000n)?.toISOString()).toBe(
      '2023-11-14T22:13:20.000Z',
    );
    expect(egressDate(0n)).toBeNull();
  });
  it('only completes after verifying the expected object and its full size', async () => {
    await worker.applyEgress(info());
    expect(size).toHaveBeenCalledWith(stored.s3Key);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ version: 3 }) as unknown,
        data: expect.objectContaining({
          status: 'COMPLETED',
          sizeBytes: 5_000_000_000n,
          durationSeconds: 65,
        }) as unknown,
      }),
    );
  });
  it.each([0n, 400n])(
    'keeps processing for empty or mismatched S3 size %s',
    async (value) => {
      size.mockResolvedValue(value);
      await worker.applyEgress(info());
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PROCESSING',
            failureCode: 'VERIFYING_UPLOAD',
          }) as unknown,
        }),
      );
    },
  );
  it('keeps processing when S3 verification fails temporarily', async () => {
    size.mockRejectedValue(new Error('network'));
    await worker.applyEgress(info());
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PROCESSING' }) as unknown,
      }),
    );
  });
  it('ignores an egress from a different room', async () => {
    await expect(
      worker.applyEgress(new EgressInfo({ ...info(), roomName: 'other-room' })),
    ).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(size).not.toHaveBeenCalled();
  });
  it('does not regress a completed recording on a delayed active event', async () => {
    find.mockResolvedValue({ ...stored, status: 'COMPLETED' });
    await worker.applyEgress(
      new EgressInfo({ ...info(), status: EgressStatus.EGRESS_ACTIVE }),
    );
    expect(update).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledWith('EG_1');
  });
  it('ignores events older than the last accepted update', async () => {
    await worker.applyEgress(new EgressInfo({ ...info(), updatedAt: 1n }));
    expect(update).not.toHaveBeenCalled();
  });
  it('does not return to recording after a stop was requested', async () => {
    find.mockResolvedValue({
      ...stored,
      status: 'PROCESSING',
      stopRequestedAt: new Date(),
    });
    await worker.applyEgress(
      new EgressInfo({ ...info(), status: EgressStatus.EGRESS_ACTIVE }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PROCESSING' }) as unknown,
      }),
    );
  });
  it('rejects a file outside the server-owned recording key', async () => {
    const event = info();
    event.fileResults[0].filename = 'someone-elses-file.mp4';
    await worker.applyEgress(event);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          failureCode: 'RECORDING_OUTPUT_INVALID',
        }) as unknown,
      }),
    );
    expect(size).not.toHaveBeenCalled();
  });
});
