jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('livekit-server-sdk', () => ({
  ...jest.requireActual<object>('@livekit/protocol'),
}));

import { MeetingRecordingService } from './meeting-recording.service';
import { MeetingRecordingWorker } from './meeting-recording.worker';
import {
  MeetingRecordingSegmentsService,
  RecordingJobPending,
} from './meeting-recording-segments.service';
import type { MeetingRecording, MeetingRecordingJob } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import type { S3Service } from '../../../infrastructure/s3/s3.service';
import type { MeetingPolicyService } from './meeting-policy.service';
import type { MeetingRealtimeService } from './meeting-realtime.service';
import type { MeetingRecordingMediaService } from './meeting-recording-media.service';
import type { ClientKafka } from '@nestjs/microservices';
import { EgressInfo, EgressStatus } from '@livekit/protocol';

describe('recording sessions and permissions', () => {
  const meeting = {
    id: 'meeting',
    hostId: 'host',
    createdBy: 'owner',
    status: 'LIVE',
    autoRecord: false,
    recordingLayout: 'speaker',
  };
  const base = {
    id: 'recording',
    meetingId: 'meeting',
    status: 'RECORDING',
    startedBy: 'starter',
    version: 2,
    segmentIndex: 0,
    durationSeconds: 0,
    segmentKey: 'recordings/meeting/recording/part-0000.mp4',
    startedAt: new Date(),
    stopRequestedAt: null,
    pauseRequestedAt: null,
  };
  let tx: ReturnType<typeof transaction>;
  let service: MeetingRecordingService;
  const media = { isAvailable: () => true } as MeetingRecordingMediaService;
  const realtime = { emitMeetingEvent: jest.fn() };
  function transaction() {
    return {
      $queryRaw: jest.fn((sql: TemplateStringsArray) => {
        if (sql.join('').includes('pg_advisory_xact_lock'))
          return Promise.reject(
            new Error("Failed to deserialize column of type 'void'"),
          );
        return Promise.resolve([]);
      }),
      $executeRaw: jest.fn().mockResolvedValue(1),
      meeting: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(meeting),
        update: jest.fn().mockResolvedValue({
          ...meeting,
          autoRecord: true,
          recordingLayout: 'grid',
        }),
      },
      meetingParticipant: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ status: 'JOINED', role: 'COHOST' }),
      },
      meetingRecording: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(base),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(base),
      },
      meetingRecordingJob: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
        create: jest.fn(),
      },
    };
  }
  beforeEach(() => {
    tx = transaction();
    service = new MeetingRecordingService(
      {
        ...tx,
        $transaction: (fn: (tx: unknown) => unknown) => fn(tx),
      } as unknown as PrismaService,
      { isRecordingConfigured: () => true } as LiveKitService,
      {} as S3Service,
      {
        assertJoinedMeetingParticipant: jest.fn().mockResolvedValue({
          meeting,
          participant: { status: 'JOINED', role: 'COHOST' },
        }),
        assertMeetingHost: jest.fn().mockResolvedValue({ meeting }),
      } as unknown as MeetingPolicyService,
      realtime as unknown as MeetingRealtimeService,
      media,
    );
  });
  it('starts and queues encoding when PostgreSQL cannot deserialize void results', async () => {
    tx.meetingRecording.findFirst.mockResolvedValue(null);
    await expect(
      service.start('join', 'cohost', { layout: 'speaker' }, 'start-1'),
    ).resolves.toMatchObject({ status: 'STARTING' });
    expect(tx.meetingRecording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        meetingId: meeting.id,
        ownerId: meeting.createdBy,
        status: 'STARTING',
        jobs: {
          create: expect.objectContaining({ kind: 'START' }) as unknown,
        },
      }) as unknown,
    });
  });
  it('pauses without ending or creating a new logical recording', async () => {
    await expect(
      service.pause('join', 'cohost', base.id, 'pause-1'),
    ).resolves.toEqual({ id: base.id, status: 'PAUSING' });
    expect(tx.meetingRecording.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PAUSING',
          pauseRequestedAt: expect.any(Date) as unknown,
        }) as unknown,
      }),
    );
    const argument = tx.meetingRecording.update.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(argument[0].data).not.toHaveProperty('stopRequestedAt');
  });
  it('resumes into a unique segment and preserves ownership, first start, and duration', async () => {
    tx.meetingRecording.findUnique.mockResolvedValue({
      ...base,
      status: 'PAUSED',
      durationSeconds: 30,
    });
    await expect(
      service.resume('join', 'cohost', base.id, 'resume-1'),
    ).resolves.toEqual({ id: base.id, status: 'STARTING' });
    const argument = tx.meetingRecording.update.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    const update = argument[0].data;
    expect(update).toMatchObject({
      segmentKey: 'recordings/meeting/recording/part-0001.mp4',
      livekitEgressId: null,
      controlRequestedBy: 'cohost',
    });
    for (const field of [
      'ownerId',
      'startedBy',
      'startedAt',
      'durationSeconds',
    ])
      expect(update).not.toHaveProperty(field);
  });
  it.each(['LEFT', 'REMOVED', 'REQUESTED'])(
    'rejects %s even after a previous idempotent pause',
    async (status) => {
      tx.meetingParticipant.findUnique.mockResolvedValue({
        status,
        role: 'HOST',
        canRecord: true,
      });
      tx.meetingRecordingJob.findUnique.mockResolvedValue({
        recordingId: base.id,
      });
      await expect(
        service.pause('join', 'host', base.id, 'same-key'),
      ).rejects.toMatchObject({ status: 403 });
      expect(tx.meetingRecording.update).not.toHaveBeenCalled();
    },
  );
  it('restricts a granted participant to their own recording', async () => {
    tx.meetingParticipant.findUnique.mockResolvedValue({
      status: 'JOINED',
      role: 'PARTICIPANT',
      canRecord: true,
    });
    await expect(
      service.pause('join', 'other', base.id, 'key'),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.pause('join', 'starter', base.id, 'key'),
    ).resolves.toMatchObject({ status: 'PAUSING' });
  });
  it('replays a resume key without creating another segment after a later pause', async () => {
    tx.meetingRecording.findUnique.mockResolvedValue({
      ...base,
      status: 'PAUSED',
      segmentIndex: 1,
    });
    tx.meetingRecordingJob.findUnique.mockResolvedValue({
      recordingId: base.id,
    });
    await expect(
      service.resume('join', 'cohost', base.id, 'old-resume'),
    ).resolves.toMatchObject({ status: 'PAUSED' });
    expect(tx.meetingRecording.update).not.toHaveBeenCalled();
  });
  it('rejects a pause for another meeting', async () => {
    tx.meetingRecording.findUnique.mockResolvedValue({
      ...base,
      meetingId: 'other',
    });
    await expect(
      service.pause('join', 'cohost', base.id, 'key'),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('does not resume before the current segment has been confirmed saved', async () => {
    tx.meetingRecording.findUnique.mockResolvedValue({
      ...base,
      status: 'PAUSING',
    });
    await expect(
      service.resume('join', 'cohost', base.id, 'key'),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('reserves encoder capacity again on resume', async () => {
    tx.meetingRecording.findUnique.mockResolvedValue({
      ...base,
      status: 'PAUSED',
    });
    tx.meetingRecording.count.mockResolvedValue(1000);
    await expect(
      service.resume('join', 'cohost', base.id, 'key'),
    ).rejects.toMatchObject({ status: 429 });
    expect(tx.meetingRecording.update).not.toHaveBeenCalled();
    const argument = tx.meetingRecording.count.mock.calls[0] as [
      { where: { status: { in: string[] } } },
    ];
    const where = argument[0].where;
    expect(where.status.in).not.toContain('PAUSED');
  });
  it('keeps legacy recordings stoppable but prevents unsupported Pause', async () => {
    tx.meetingRecording.findUnique.mockResolvedValue({
      ...base,
      segmentKey: null,
    });
    await expect(
      service.pause('join', 'cohost', base.id, 'key'),
    ).rejects.toMatchObject({ status: 503 });
  });
  it('finalizes already saved segments when stopping while paused', async () => {
    tx.meetingRecording.findUnique.mockResolvedValue({
      ...base,
      status: 'PAUSED',
    });
    await expect(
      service.stop('join', 'cohost', base.id, 'key'),
    ).resolves.toMatchObject({ status: 'PROCESSING' });
    expect(tx.meetingRecordingJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { recordingId: base.id, kind: 'MERGE' },
      }),
    );
  });
  it('allows only the actual joined host to change auto-record settings', async () => {
    await expect(
      service.configure('join', 'cohost', { autoRecord: true }),
    ).rejects.toMatchObject({ status: 403 });
    tx.meetingParticipant.findUnique.mockResolvedValue({
      status: 'JOINED',
      role: 'HOST',
    });
    await service.configure('join', 'host', {
      autoRecord: true,
      layout: 'grid',
    });
    expect(tx.meeting.update).toHaveBeenCalledWith({
      where: { id: meeting.id },
      data: { autoRecord: true, recordingLayout: 'grid' },
    });
  });
  it('rechecks auto-record history under the meeting lock after a concurrent manual Stop', async () => {
    tx.meeting.findUniqueOrThrow.mockResolvedValue({
      ...meeting,
      autoRecord: true,
    });
    tx.meetingRecording.findFirst.mockResolvedValue(null);
    tx.meetingRecording.count.mockResolvedValue(1);
    await expect(
      service.start(
        'join',
        'cohost',
        { layout: 'speaker' },
        'auto-meeting',
        true,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(tx.meetingRecording.update).not.toHaveBeenCalled();
  });
});

describe('segment verification and assembly', () => {
  const base = {
    id: 'recording',
    version: 2,
    status: 'PROCESSING',
    failureCode: 'MERGE_PENDING',
    s3Key: 'final.mp4',
    segmentKey: 'part-0.mp4',
    segmentIndex: 0,
    livekitEgressId: 'EG_0',
    pauseRequestedAt: new Date(),
    stopRequestedAt: null,
    startedAt: new Date(),
  } as MeetingRecording;
  let tx: {
    meetingRecording: { updateMany: jest.Mock; update: jest.Mock };
    meetingRecordingSegment: {
      upsert: jest.Mock;
      aggregate: jest.Mock;
      findMany: jest.Mock;
    };
    meetingRecordingJob: { upsert: jest.Mock; updateMany: jest.Mock };
  };
  let s3: {
    copyRecording: jest.Mock;
    getFileSize: jest.Mock;
    uploadRecordingBackup: jest.Mock;
  };
  let assemble: jest.Mock;
  let service: MeetingRecordingSegmentsService;
  const signal = () => new AbortController().signal;
  beforeEach(() => {
    tx = {
      meetingRecording: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
      meetingRecordingSegment: {
        upsert: jest.fn(),
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { durationSeconds: 30 } }),
        findMany: jest
          .fn()
          .mockResolvedValue([
            { index: 0, s3Key: base.segmentKey, sizeBytes: 100n },
          ]),
      },
      meetingRecordingJob: {
        upsert: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    s3 = {
      copyRecording: jest.fn(),
      getFileSize: jest.fn().mockResolvedValue(100n),
      uploadRecordingBackup: jest.fn().mockResolvedValue(100n),
    };
    assemble = jest.fn().mockResolvedValue('assembled.mp4');
    service = new MeetingRecordingSegmentsService(
      {
        ...tx,
        $transaction: (fn: (tx: unknown) => unknown) => fn(tx),
      } as unknown as PrismaService,
      s3 as unknown as S3Service,
      { assemble } as unknown as MeetingRecordingMediaService,
    );
  });
  it('confirms Pause only when segment metadata is archived transactionally', async () => {
    await service.complete(base, {
      egressId: 'EG_0',
      size: 100n,
      duration: 30,
      startedAt: base.startedAt,
      stoppedAt: new Date(),
      updatedAt: 2n,
    });
    expect(tx.meetingRecording.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PAUSED',
          failureCode: null,
        }) as unknown,
      }),
    );
    expect(tx.meetingRecording.update).toHaveBeenCalledWith({
      where: { id: base.id },
      data: { durationSeconds: 30 },
    });
    expect(tx.meetingRecordingJob.upsert).not.toHaveBeenCalled();
  });
  it('lets final Stop supersede a pending Pause', async () => {
    await service.complete(
      { ...base, stopRequestedAt: new Date() },
      {
        egressId: 'EG_0',
        size: 100n,
        duration: 30,
        startedAt: base.startedAt,
        stoppedAt: new Date(),
        updatedAt: 2n,
      },
    );
    expect(tx.meetingRecording.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PROCESSING',
          failureCode: 'MERGE_PENDING',
        }) as unknown,
      }),
    );
  });
  it('retains fractional segment time and rounds only the cumulative duration', async () => {
    tx.meetingRecordingSegment.aggregate.mockResolvedValue({
      _sum: { durationSeconds: 4.5 },
    });
    await service.complete(base, {
      egressId: 'EG_0',
      size: 100n,
      duration: 1.75,
      startedAt: base.startedAt,
      stoppedAt: new Date(),
      updatedAt: 2n,
    });
    expect(tx.meetingRecording.update).toHaveBeenCalledWith({
      where: { id: base.id },
      data: { durationSeconds: 4 },
    });
    expect(tx.meetingRecordingSegment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ durationSeconds: 1.75 }) as unknown,
      }),
    );
  });
  it('does not archive a late completion after another transition wins', async () => {
    tx.meetingRecording.updateMany.mockResolvedValue({ count: 0 });
    await service.complete(base, {
      egressId: 'EG_0',
      size: 100n,
      duration: 30,
      startedAt: base.startedAt,
      stoppedAt: new Date(),
      updatedAt: 2n,
    });
    expect(tx.meetingRecordingSegment.upsert).not.toHaveBeenCalled();
  });
  it('copies one segment within S3 without downloading or encoding', async () => {
    await expect(
      service.merge(base, {} as MeetingRecordingJob, 'lease', signal()),
    ).resolves.toBe(true);
    expect(s3.copyRecording).toHaveBeenCalledWith(
      base.segmentKey,
      base.s3Key,
      expect.any(AbortSignal),
    );
    expect(assemble).not.toHaveBeenCalled();
    expect(
      tx.meetingRecordingJob.upsert.mock.calls.map(
        ([arg]) => (arg as { create: { kind: string } }).create.kind,
      ),
    ).toEqual(['NOTIFY', 'CLEANUP']);
  });
  it('waits for every segment rather than publishing a truncated recording', async () => {
    await expect(
      service.merge(
        { ...base, segmentIndex: 1 },
        {} as MeetingRecordingJob,
        'lease',
        signal(),
      ),
    ).rejects.toBeInstanceOf(RecordingJobPending);
    expect(s3.copyRecording).not.toHaveBeenCalled();
  });
  it('does not publish a final file until its size has been verified', async () => {
    s3.getFileSize.mockResolvedValue(99n);
    await expect(
      service.merge(base, {} as MeetingRecordingJob, 'lease', signal()),
    ).rejects.toThrow('verification failed');
    expect(tx.meetingRecording.updateMany).not.toHaveBeenCalled();
  });
  it('requires ownership of the worker lease at the final database commit', async () => {
    tx.meetingRecordingJob.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.merge(
        base,
        { id: 'job' } as MeetingRecordingJob,
        'lost-lease',
        signal(),
      ),
    ).rejects.toThrow('lease lost');
    expect(tx.meetingRecording.updateMany).not.toHaveBeenCalled();
    expect(tx.meetingRecordingJob.upsert).not.toHaveBeenCalled();
  });
  it('preserves resumable upload checkpoints and rejects a lost merge lease', async () => {
    tx.meetingRecordingJob.updateMany.mockResolvedValue({ count: 0 });
    tx.meetingRecordingSegment.findMany.mockResolvedValue([
      { index: 0, sizeBytes: 100n },
      { index: 1, sizeBytes: 100n },
    ]);
    s3.uploadRecordingBackup.mockImplementation(
      async (
        _path: string,
        _key: string,
        options: { onCheckpoint: (state: null) => Promise<void> },
      ) => {
        await options.onCheckpoint(null);
        return 100n;
      },
    );
    await expect(
      service.merge(
        { ...base, segmentIndex: 1 },
        { id: 'job' } as MeetingRecordingJob,
        'lost-lease',
        signal(),
      ),
    ).rejects.toThrow('lease lost');
    expect(tx.meetingRecording.updateMany).not.toHaveBeenCalled();
  });
});

describe('automatic recording', () => {
  it('requeues deletion for output written late by a failed egress', async () => {
    const enqueue = jest.fn();
    const worker = new MeetingRecordingWorker(
      {
        meetingRecording: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'recording',
            status: 'DELETED',
            livekitEgressId: 'EG_late',
            meeting: { roomName: 'room' },
          }),
        },
        meetingRecordingJob: { upsert: enqueue },
      } as unknown as PrismaService,
      {} as LiveKitService,
      {} as S3Service,
      {} as MeetingRealtimeService,
      {} as ClientKafka,
    );
    await worker.applyEgress(
      new EgressInfo({
        egressId: 'EG_late',
        roomName: 'room',
        status: EgressStatus.EGRESS_COMPLETE,
      }),
    );
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ state: 'PENDING' }) as unknown,
      }),
    );
  });
  it('waits for the actual host connection and uses a stable per-meeting start key', async () => {
    const meeting = {
      id: 'meeting',
      joinToken: 'join',
      hostId: 'host',
      roomName: 'room',
      recordingLayout: 'grid',
      participants: [{ userId: 'host' }],
    };
    const findMany = jest.fn().mockResolvedValue([meeting]);
    const connected = jest.fn().mockResolvedValue(false);
    const start = jest.fn();
    const worker = new MeetingRecordingWorker(
      { meeting: { findMany } } as unknown as PrismaService,
      {
        isRecordingConfigured: () => true,
        isParticipantConnected: connected,
      } as unknown as LiveKitService,
      {} as S3Service,
      {} as MeetingRealtimeService,
      {} as ClientKafka,
      undefined,
      undefined,
      { start } as unknown as MeetingRecordingService,
    );
    await worker.requestAutomaticRecording('room');
    expect(start).not.toHaveBeenCalled();
    connected.mockResolvedValue(true);
    await worker.requestAutomaticRecording('room');
    expect(start).toHaveBeenCalledWith(
      'join',
      'host',
      { layout: 'grid' },
      'auto-meeting',
      true,
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ recordings: { none: {} } }) as unknown,
      }),
    );
  });
});
