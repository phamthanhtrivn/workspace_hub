jest.mock('livekit-server-sdk', () => ({
  ...jest.requireActual<object>('@livekit/protocol'),
}));
jest.mock('fs/promises', () => ({
  lstat: jest
    .fn()
    .mockResolvedValue({ isFile: () => true, isSymbolicLink: () => false }),
  unlink: jest.fn().mockResolvedValue(undefined),
}));
import { EgressInfo, EgressStatus } from '@livekit/protocol';
import { MeetingRecordingWorker } from './meeting-recording.worker';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { S3Service } from '../../../infrastructure/s3/s3.service';
import type { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import type { MeetingRealtimeService } from './meeting-realtime.service';
import type { ClientKafka } from '@nestjs/microservices';

describe('independent recording worker lanes', () => {
  const egress = new EgressInfo({
    egressId: 'EG_stop',
    roomName: 'room',
    status: EgressStatus.EGRESS_ACTIVE,
  });
  const base = {
    id: 'rec',
    meetingId: 'meeting',
    ownerId: 'owner',
    s3Key: 'recordings/meeting/rec.mp4',
    version: 0,
    egressUpdatedAt: 0n,
    requestedAt: new Date(),
    updatedAt: new Date(),
    permissions: [],
    meeting: { roomName: 'room', status: 'LIVE' },
  };
  let jobs: Array<{
    id: string;
    recordingId: string;
    kind: string;
    attempts: number;
  }>;
  let update: jest.Mock;
  let upload: jest.Mock;
  let stop: jest.Mock;
  let list: jest.Mock;
  let active: jest.Mock;
  let find: jest.Mock;
  let enqueue: jest.Mock;
  let worker: MeetingRecordingWorker;
  beforeEach(() => {
    jobs = [];
    process.env.MEETING_RECORDING_WORKER_ROLE = 'all';
    process.env.RECORDING_BACKUP_ROOT = process.cwd();
    update = jest.fn().mockResolvedValue({ count: 1 });
    upload = jest.fn().mockResolvedValue(100n);
    stop = jest
      .fn()
      .mockResolvedValue(
        new EgressInfo({ ...egress, status: EgressStatus.EGRESS_ENDING }),
      );
    list = jest.fn().mockResolvedValue([egress]);
    active = jest.fn().mockResolvedValue([]);
    enqueue = jest.fn().mockResolvedValue({});
    find = jest
      .fn()
      .mockImplementation(
        ({ where }: { where: { id?: string; livekitEgressId?: string } }) =>
          Promise.resolve(
            where.id === 'recover'
              ? {
                  ...base,
                  id: 'recover',
                  status: 'PROCESSING',
                  failureCode: 'UPLOAD_RECOVERY_PENDING',
                }
              : { ...base, status: 'FAILED', livekitEgressId: 'EG_stop' },
          ),
      );
    worker = new MeetingRecordingWorker(
      {
        meetingRecording: {
          findMany: active,
          findUniqueOrThrow: find,
          findUnique: find,
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        meetingRecordingJob: {
          upsert: enqueue,
          findMany: jest
            .fn()
            .mockImplementation(
              ({ where }: { where: { kind: { in: string[] } } }) =>
                Promise.resolve(
                  jobs.filter((job) => where.kind.in.includes(job.kind)),
                ),
            ),
          updateMany: update,
        },
      } as unknown as PrismaService,
      {
        isRecordingConfigured: () => true,
        listRecordings: list,
        stopRecording: stop,
      } as unknown as LiveKitService,
      {
        uploadRecordingBackup: upload,
        getFileSize: jest.fn().mockResolvedValue(100n),
      } as unknown as S3Service,
      {} as MeetingRealtimeService,
      {} as ClientKafka,
    );
  });
  afterEach(() => {
    worker.onModuleDestroy();
    jest.useRealTimers();
    delete process.env.MEETING_RECORDING_WORKER_ROLE;
    delete process.env.RECORDING_BACKUP_ROOT;
  });

  it('processes Stop during an unfinished recovery upload', async () => {
    let finish!: (size: bigint) => void;
    upload.mockImplementation(
      () =>
        new Promise<bigint>((resolve) => {
          finish = resolve;
        }),
    );
    jobs.push({
      id: 'upload-job',
      recordingId: 'recover',
      kind: 'RECOVER',
      attempts: 0,
    });
    const first = worker.tick();
    await new Promise(setImmediate);
    expect(upload).toHaveBeenCalledTimes(1);
    jobs.push({
      id: 'stop-job',
      recordingId: 'stop',
      kind: 'STOP',
      attempts: 0,
    });
    await worker.tick();
    expect(stop).toHaveBeenCalledWith('EG_stop');
    expect(upload).toHaveBeenCalledTimes(1);
    finish(100n);
    await first;
  });

  it('cancels recovery when the lease is lost and does not mark it done', async () => {
    jest.useFakeTimers();
    jobs.push({
      id: 'upload-job',
      recordingId: 'recover',
      kind: 'RECOVER',
      attempts: 0,
    });
    let signal: AbortSignal | undefined;
    upload.mockImplementation(
      (_path: string, _key: string, options: { signal: AbortSignal }) => {
        signal = options.signal;
        return new Promise((_resolve, reject) =>
          options.signal.addEventListener('abort', () =>
            reject(new Error('lease lost')),
          ),
        );
      },
    );
    let claimed = false;
    update.mockImplementation(() => {
      const count = claimed ? 0 : 1;
      claimed = true;
      return Promise.resolve({ count });
    });
    const running = worker.tick();
    await jest.advanceTimersByTimeAsync(30_000);
    await running;
    expect(signal?.aborted).toBe(true);
    const writes = update.mock.calls.map(
      (call: unknown[]) => call[0] as { data: { state?: string } },
    );
    expect(writes.some((call) => call.data.state === 'DONE')).toBe(false);
  });

  it('batches reconciliation into one LiveKit request and throttles subsequent scans', async () => {
    const stored = {
      ...base,
      status: 'RECORDING',
      livekitEgressId: 'EG_stop',
      stopRequestedAt: null,
    };
    active.mockResolvedValue([
      stored,
      { ...stored, id: 'second', livekitEgressId: 'EG_second' },
    ]);
    list.mockResolvedValue([
      egress,
      new EgressInfo({ ...egress, egressId: 'EG_second' }),
    ]);
    find.mockImplementation(
      ({ where }: { where: { livekitEgressId: string } }) =>
        Promise.resolve({ ...stored, livekitEgressId: where.livekitEgressId }),
    );
    await worker.tick();
    await worker.tick();
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith();
  });

  it('runs only the configured upload lane in a dedicated upload process', async () => {
    process.env.MEETING_RECORDING_WORKER_ROLE = 'upload';
    jobs.push({
      id: 'stop-job',
      recordingId: 'stop',
      kind: 'STOP',
      attempts: 0,
    });
    await worker.tick();
    expect(stop).not.toHaveBeenCalled();
    expect(active).not.toHaveBeenCalled();
  });

  it('keeps backup recovery active after LiveKit has expired the completed egress', async () => {
    active.mockResolvedValue([
      {
        ...base,
        status: 'PROCESSING',
        failureCode: 'UPLOAD_RECOVERY_PENDING',
        livekitEgressId: 'expired-egress',
        updatedAt: new Date(Date.now() - 60 * 60_000),
      },
    ]);
    list.mockResolvedValue([]);
    const fail = jest.spyOn(
      worker as unknown as {
        fail: (id: string, code: string) => Promise<void>;
      },
      'fail',
    );
    await worker.tick();
    expect(fail).not.toHaveBeenCalled();
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { recordingId: base.id, kind: 'RECOVER' },
        update: {},
      }),
    );
  });

  it('stops accepting new jobs after shutdown', async () => {
    worker.onModuleDestroy();
    jobs.push({
      id: 'stop-job',
      recordingId: 'stop',
      kind: 'STOP',
      attempts: 0,
    });
    await worker.tick();
    expect(stop).not.toHaveBeenCalled();
  });

  it('finishes failure reconciliation after a crash between exhausted retries and recording update', async () => {
    active.mockResolvedValue([
      { ...base, status: 'PROCESSING', failureCode: 'UPLOAD_RECOVERY_PENDING' },
    ]);
    enqueue.mockResolvedValue({ state: 'FAILED' });
    const fail = jest
      .spyOn(
        worker as unknown as {
          fail: (id: string, code: string) => Promise<void>;
        },
        'fail',
      )
      .mockResolvedValue(undefined);
    await worker.tick();
    expect(fail).toHaveBeenCalledWith(base.id, 'UPLOAD_RECOVERY_FAILED');
  });
});
