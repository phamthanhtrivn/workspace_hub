import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { randomUUID } from 'crypto';
import { resolve, sep } from 'path';
import { lstat, unlink } from 'fs/promises';
import { EgressInfo, EgressStatus } from 'livekit-server-sdk';
import {
  MeetingRecording,
  MeetingRecordingJob,
  MeetingRecordingStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import { S3Service } from '../../../infrastructure/s3/s3.service';
import { parseRecordingUploadState } from '../../../infrastructure/s3/recording-multipart-upload';
import { MeetingRealtimeService } from './meeting-realtime.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import {
  ACTIVE_RECORDING_STATUSES,
  egressDate,
  recordingCapabilities,
} from '../utils/meeting-recording.utils';

@Injectable()
export class MeetingRecordingWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MeetingRecordingWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private readonly lanes = new Set<string>();
  private readonly abortControllers = new Set<AbortController>();
  private nextReconcileAt = 0;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly liveKit: LiveKitService,
    private readonly s3: S3Service,
    private readonly realtime: MeetingRealtimeService,
    @Inject('KAFKA_PRODUCER') private readonly kafka: ClientKafka,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 5000);
    this.timer.unref();
  }

  onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    for (const controller of this.abortControllers) controller.abort();
  }

  async tick() {
    if (this.stopping || !this.liveKit.isRecordingConfigured()) return;
    const role = process.env.MEETING_RECORDING_WORKER_ROLE || 'all';
    const tasks: Promise<void>[] = [];
    if (role === 'all' || role === 'control') {
      tasks.push(this.runLane('control', ['STOP', 'START'], 2));
      tasks.push(this.runLane('maintenance', ['DELETE', 'NOTIFY'], 2));
      tasks.push(this.reconcileTick());
    }
    if (role === 'all' || role === 'upload')
      tasks.push(this.runLane('upload', ['RECOVER'], 1));
    await Promise.allSettled(tasks);
  }

  private async runLane(name: string, kinds: string[], concurrency: number) {
    if (this.lanes.has(name) || this.stopping) return;
    this.lanes.add(name);
    try {
      const jobs = await this.prisma.meetingRecordingJob.findMany({
        where: {
          kind: { in: kinds },
          OR: [
            { state: 'PENDING', nextAttemptAt: { lte: new Date() } },
            { state: 'RUNNING', leaseUntil: { lt: new Date() } },
          ],
        },
        orderBy: [{ kind: 'desc' }, { createdAt: 'asc' }],
        take: concurrency * 4,
      });
      for (
        let offset = 0;
        offset < jobs.length && !this.stopping;
        offset += concurrency
      )
        await Promise.allSettled(
          jobs
            .slice(offset, offset + concurrency)
            .map((job) => this.runJob(job)),
        );
    } catch {
      this.logger.warn(`Recording ${name} lane will retry`);
    } finally {
      this.lanes.delete(name);
    }
  }

  private async reconcileTick() {
    if (this.lanes.has('reconcile') || Date.now() < this.nextReconcileAt)
      return;
    this.lanes.add('reconcile');
    this.nextReconcileAt = Date.now() + 30_000;
    try {
      await this.reconcile();
    } catch {
      this.logger.warn('Recording reconciliation will retry');
    } finally {
      this.lanes.delete('reconcile');
    }
  }

  async requestMeetingStop(meetingId: string) {
    const recordings = await this.prisma.meetingRecording.findMany({
      where: { meetingId, status: { in: ACTIVE_RECORDING_STATUSES } },
    });
    for (const recording of recordings) await this.queueStop(recording);
  }

  async applyEgress(info: EgressInfo) {
    let recording = await this.prisma.meetingRecording.findUnique({
      where: { livekitEgressId: info.egressId },
      include: { meeting: true },
    });
    if (!recording) {
      const key = this.outputKey(info);
      if (!key) return false;
      recording = await this.prisma.meetingRecording.findFirst({
        where: { s3Key: key, meeting: { roomName: info.roomName } },
        include: { meeting: true },
      });
    }
    if (
      !recording ||
      recording.meeting.roomName !== info.roomName ||
      (recording.livekitEgressId && recording.livekitEgressId !== info.egressId)
    )
      return false;
    if (!ACTIVE_RECORDING_STATUSES.includes(recording.status)) {
      if (
        info.status === EgressStatus.EGRESS_ACTIVE ||
        info.status === EgressStatus.EGRESS_STARTING
      )
        await this.liveKit.stopRecording(info.egressId);
      return true;
    }
    const timestamp = info.updatedAt || info.endedAt || info.startedAt;
    if (timestamp && timestamp < recording.egressUpdatedAt) return true;
    const data: Parameters<
      typeof this.prisma.meetingRecording.update
    >[0]['data'] = {
      livekitEgressId: info.egressId,
      version: { increment: 1 },
      egressUpdatedAt: timestamp || recording.egressUpdatedAt,
    };
    const startedAt = egressDate(info.startedAt);
    if (startedAt) data.startedAt = startedAt;

    if (
      info.status === EgressStatus.EGRESS_COMPLETE ||
      info.status === EgressStatus.EGRESS_LIMIT_REACHED
    ) {
      data.status = 'PROCESSING';
      data.stoppedAt =
        egressDate(info.endedAt) ?? recording.stoppedAt ?? new Date();
      const file = info.fileResults[0];
      if (info.backupStorageUsed) {
        data.failureCode = process.env.RECORDING_BACKUP_ROOT
          ? 'UPLOAD_RECOVERY_PENDING'
          : 'UPLOAD_BACKUP_REQUIRES_RECOVERY';
        data.status = process.env.RECORDING_BACKUP_ROOT
          ? 'PROCESSING'
          : 'FAILED';
        if (file) {
          data.sizeBytes = file.size;
          data.durationSeconds = Number(file.duration / 1_000_000_000n);
        }
      } else if (
        !file ||
        !recording.s3Key ||
        (file.filename !== recording.s3Key &&
          file.filename !== recording.fileName &&
          !file.filename.endsWith(`/${recording.s3Key}`))
      ) {
        data.status = 'FAILED';
        data.failureCode = 'RECORDING_OUTPUT_INVALID';
      } else {
        try {
          const size = await this.s3.getFileSize(recording.s3Key);
          if (size <= 0n || (file.size > 0n && size !== file.size))
            throw new Error('size mismatch');
          data.status = 'COMPLETED';
          data.sizeBytes = size;
          data.durationSeconds = Number(file.duration / 1_000_000_000n);
          data.completedAt = new Date();
          data.failureCode = null;
        } catch {
          data.failureCode = 'VERIFYING_UPLOAD';
        }
      }
    } else if (
      info.status === EgressStatus.EGRESS_FAILED ||
      info.status === EgressStatus.EGRESS_ABORTED
    ) {
      data.status = 'FAILED';
      data.failureCode = 'EGRESS_FAILED';
      data.stoppedAt = egressDate(info.endedAt) ?? new Date();
    } else if (
      recording.stopRequestedAt ||
      recording.status === 'PROCESSING' ||
      info.status === EgressStatus.EGRESS_ENDING
    ) {
      data.status = 'PROCESSING';
    } else if (info.status === EgressStatus.EGRESS_ACTIVE)
      data.status = 'RECORDING';
    else data.status = recording.status;

    if (
      data.status === recording.status &&
      (data.failureCode === undefined ||
        data.failureCode === recording.failureCode) &&
      recording.livekitEgressId === info.egressId &&
      timestamp === recording.egressUpdatedAt
    ) {
      if (data.failureCode === 'UPLOAD_RECOVERY_PENDING')
        await this.ensureRecovery(recording.id);
      return true;
    }
    const changed = await this.prisma.meetingRecording.updateMany({
      where: {
        id: recording.id,
        version: recording.version,
        status: { in: ACTIVE_RECORDING_STATUSES },
      },
      data,
    });
    if (changed.count) {
      if (data.failureCode === 'UPLOAD_RECOVERY_PENDING')
        await this.ensureRecovery(recording.id);
      await this.publish(recording.id);
    }
    return true;
  }

  private outputKey(info: EgressInfo): string | undefined {
    if (info.request.case === 'egress') {
      const file = info.request.value.outputs.find(
        (output) => output.config.case === 'file',
      );
      if (file?.config.case === 'file') return file.config.value.filepath;
    }
    return info.fileResults[0]?.filename;
  }

  private async ensureRecovery(recordingId: string) {
    const job = await this.prisma.meetingRecordingJob.upsert({
      where: { recordingId_kind: { recordingId, kind: 'RECOVER' } },
      create: { recordingId, kind: 'RECOVER' },
      update: {},
    });
    if (job.state === 'FAILED')
      await this.fail(recordingId, 'UPLOAD_RECOVERY_FAILED');
  }

  private async reconcile() {
    const recordings = await this.prisma.meetingRecording.findMany({
      where: { status: { in: ACTIVE_RECORDING_STATUSES } },
      include: { meeting: true },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    });
    if (!recordings.length) return;
    const infos = await this.liveKit.listRecordings();
    for (const recording of recordings) {
      try {
        if (recording.failureCode === 'UPLOAD_RECOVERY_PENDING') {
          await this.ensureRecovery(recording.id);
          continue;
        }
        const maxDuration =
          Number(process.env.MEETING_RECORDING_MAX_MINUTES || 120) * 60_000;
        if (
          recording.meeting.status !== 'LIVE' ||
          (recording.startedAt &&
            Date.now() - recording.startedAt.getTime() >= maxDuration)
        )
          await this.queueStop(recording);
        if (!recording.livekitEgressId) continue;
        const info = infos.find(
          (candidate) => candidate.egressId === recording.livekitEgressId,
        );
        if (info) await this.applyEgress(info);
        else if (Date.now() - recording.updatedAt.getTime() > 30 * 60_000)
          await this.fail(recording.id, 'EGRESS_NOT_FOUND');
        if (
          recording.status === 'PROCESSING' &&
          recording.failureCode !== 'UPLOAD_RECOVERY_PENDING' &&
          Date.now() -
            (
              recording.stopRequestedAt ??
              recording.stoppedAt ??
              recording.requestedAt
            ).getTime() >
            30 * 60_000
        )
          await this.fail(recording.id, 'PROCESSING_TIMEOUT');
      } catch {
        this.logger.warn(`Recording ${recording.id} reconciliation will retry`);
      }
    }
  }

  private async queueStop(recording: MeetingRecording) {
    await this.prisma.$transaction(async (tx) => {
      await tx.meetingRecording.updateMany({
        where: {
          id: recording.id,
          status: { in: ACTIVE_RECORDING_STATUSES },
          stopRequestedAt: null,
        },
        data: {
          stopRequestedAt: new Date(),
          status: 'PROCESSING',
          version: { increment: 1 },
        },
      });
      await tx.meetingRecordingJob.upsert({
        where: {
          recordingId_kind: { recordingId: recording.id, kind: 'STOP' },
        },
        create: { recordingId: recording.id, kind: 'STOP' },
        update: {},
      });
    });
  }

  private async runJob(job: MeetingRecordingJob) {
    const leaseToken = randomUUID();
    const claim = await this.prisma.meetingRecordingJob.updateMany({
      where: {
        id: job.id,
        OR: [
          { state: 'PENDING', nextAttemptAt: { lte: new Date() } },
          { state: 'RUNNING', leaseUntil: { lt: new Date() } },
        ],
      },
      data: {
        state: 'RUNNING',
        attempts: { increment: 1 },
        leaseUntil: new Date(Date.now() + 120_000),
        leaseToken,
      },
    });
    if (!claim.count) return;
    const controller = new AbortController();
    this.abortControllers.add(controller);
    const heartbeat = setInterval(() => {
      void this.prisma.meetingRecordingJob
        .updateMany({
          where: { id: job.id, leaseToken, state: 'RUNNING' },
          data: { leaseUntil: new Date(Date.now() + 120_000) },
        })
        .then((result) => {
          if (!result.count) controller.abort();
        })
        .catch(() => controller.abort());
    }, 30_000);
    heartbeat.unref();
    try {
      const recording = await this.prisma.meetingRecording.findUniqueOrThrow({
        where: { id: job.recordingId },
        include: { meeting: true },
      });
      if (job.kind === 'START') await this.startJob(recording, job, leaseToken);
      else if (job.kind === 'STOP') {
        await this.stopJob(recording);
      } else if (job.kind === 'DELETE' && recording.s3Key) {
        const recovery = await this.prisma.meetingRecordingJob.findUnique({
          where: {
            recordingId_kind: { recordingId: recording.id, kind: 'RECOVER' },
          },
        });
        const upload = parseRecordingUploadState(recovery?.uploadState);
        if (upload && upload.key === recording.s3Key)
          await this.s3.abortRecordingUpload(recording.s3Key, upload.uploadId);
        await this.s3.deleteFile(recording.s3Key);
        await this.deleteBackup(recording.s3Key);
      } else if (job.kind === 'RECOVER')
        await this.recover(recording, job, leaseToken, controller.signal);
      else if (job.kind === 'NOTIFY') await this.notify(recording);
      controller.signal.throwIfAborted();
      await this.prisma.meetingRecordingJob.updateMany({
        where: { id: job.id, leaseToken },
        data: {
          state: 'DONE',
          leaseUntil: null,
          leaseToken: null,
          uploadState: Prisma.DbNull,
        },
      });
    } catch {
      const retry =
        job.kind === 'DELETE' ||
        job.kind === 'STOP' ||
        job.kind === 'NOTIFY' ||
        job.attempts < 12;
      const retried = await this.prisma.meetingRecordingJob.updateMany({
        where: { id: job.id, leaseToken },
        data: {
          state: retry ? 'PENDING' : 'FAILED',
          leaseUntil: null,
          leaseToken: null,
          nextAttemptAt: new Date(
            Date.now() +
              Math.min(60_000, 5000 * 2 ** Math.min(job.attempts, 4)),
          ),
        },
      });
      if (retried.count && !retry)
        await this.fail(
          job.recordingId,
          job.kind === 'RECOVER'
            ? 'UPLOAD_RECOVERY_FAILED'
            : 'START_UNCONFIRMED',
        );
    } finally {
      clearInterval(heartbeat);
      this.abortControllers.delete(controller);
    }
  }

  private async startJob(
    recording: MeetingRecording & {
      meeting: { status: string; roomName: string };
    },
    job: MeetingRecordingJob,
    leaseToken: string,
  ) {
    if (!ACTIVE_RECORDING_STATUSES.includes(recording.status)) return;
    const infos = await this.liveKit.listRecordings(recording.meeting.roomName);
    const existing = infos.find(
      (info) =>
        info.egressId === recording.livekitEgressId ||
        this.outputKey(info) === recording.s3Key,
    );
    if (existing) {
      await this.applyEgress(existing);
      return;
    }
    if (job.dispatchedAt)
      throw new Error('Start may have been accepted; reconcile before retry');
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId: recording.meetingId,
          userId: recording.startedBy,
        },
      },
    });
    if (
      recording.stopRequestedAt ||
      recording.meeting.status !== 'LIVE' ||
      !recordingCapabilities(participant ?? undefined).canStart
    ) {
      await this.fail(recording.id, 'START_CANCELLED');
      return;
    }
    const dispatched = await this.prisma.meetingRecordingJob.updateMany({
      where: { id: job.id, leaseToken, state: 'RUNNING' },
      data: { dispatchedAt: new Date() },
    });
    if (!dispatched.count) return;
    await this.applyEgress(
      await this.liveKit.startRecording(
        recording.meeting.roomName,
        recording.s3Key!,
        recording.layout,
      ),
    );
  }

  private async stopJob(
    recording: MeetingRecording & { meeting: { roomName: string } },
  ) {
    const infos = await this.liveKit.listRecordings(
      recording.livekitEgressId ? undefined : recording.meeting.roomName,
      recording.livekitEgressId ?? undefined,
    );
    const info = infos.find((candidate) =>
      recording.livekitEgressId
        ? candidate.egressId === recording.livekitEgressId
        : this.outputKey(candidate) === recording.s3Key,
    );
    if (!info) {
      if (ACTIVE_RECORDING_STATUSES.includes(recording.status))
        throw new Error('waiting for egress');
      return;
    }
    if (
      [EgressStatus.EGRESS_STARTING, EgressStatus.EGRESS_ACTIVE].includes(
        info.status,
      )
    ) {
      await this.applyEgress(await this.liveKit.stopRecording(info.egressId));
    } else await this.applyEgress(info);
  }

  private async recover(
    recording: MeetingRecording,
    job: MeetingRecordingJob,
    leaseToken: string,
    signal: AbortSignal,
  ) {
    if (
      recording.status !== 'PROCESSING' ||
      recording.failureCode !== 'UPLOAD_RECOVERY_PENDING' ||
      !recording.s3Key
    )
      return;
    const root = resolve(process.env.RECORDING_BACKUP_ROOT!);
    const path = resolve(root, recording.s3Key);
    if (!path.startsWith(root + sep))
      throw new Error('Backup path outside volume');
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new Error('Backup is not a regular file');
    const size = await this.s3.uploadRecordingBackup(path, recording.s3Key, {
      state: parseRecordingUploadState(job.uploadState),
      signal,
      onCheckpoint: async (state) => {
        signal.throwIfAborted();
        const saved = await this.prisma.meetingRecordingJob.updateMany({
          where: {
            id: job.id,
            leaseToken,
            state: 'RUNNING',
            recording: {
              status: 'PROCESSING',
              failureCode: 'UPLOAD_RECOVERY_PENDING',
            },
          },
          data: {
            uploadState: state
              ? (state as unknown as Prisma.InputJsonValue)
              : Prisma.DbNull,
          },
        });
        if (!saved.count)
          throw new Error('Recording recovery lease or permission revoked');
      },
    });
    signal.throwIfAborted();
    if ((await this.s3.getFileSize(recording.s3Key)) !== size)
      throw new Error('Backup upload size mismatch');
    const changed = await this.prisma.meetingRecording.updateMany({
      where: {
        id: recording.id,
        status: 'PROCESSING',
        failureCode: 'UPLOAD_RECOVERY_PENDING',
      },
      data: {
        status: 'COMPLETED',
        sizeBytes: size,
        completedAt: new Date(),
        failureCode: null,
        version: { increment: 1 },
      },
    });
    if (changed.count) {
      await this.publish(recording.id);
      await unlink(path).catch(() => undefined);
    } else {
      const current = await this.prisma.meetingRecording.findUnique({
        where: { id: recording.id },
      });
      if (current?.status === 'DELETED') {
        await this.s3.deleteFile(recording.s3Key);
        await this.deleteBackup(recording.s3Key);
      }
    }
  }

  private async deleteBackup(key: string) {
    if (!process.env.RECORDING_BACKUP_ROOT) return;
    const root = resolve(process.env.RECORDING_BACKUP_ROOT);
    const path = resolve(root, key);
    if (!path.startsWith(root + sep))
      throw new Error('Backup path outside volume');
    try {
      const stat = await lstat(path);
      if (!stat.isFile() || stat.isSymbolicLink())
        throw new Error('Backup is not a regular file');
      await unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  private async fail(id: string, code: string) {
    const changed = await this.prisma.meetingRecording.updateMany({
      where: { id, status: { in: ACTIVE_RECORDING_STATUSES } },
      data: {
        status: MeetingRecordingStatus.FAILED,
        failureCode: code,
        version: { increment: 1 },
      },
    });
    if (changed.count) {
      await this.prisma.meetingRecordingJob.upsert({
        where: { recordingId_kind: { recordingId: id, kind: 'STOP' } },
        create: { recordingId: id, kind: 'STOP' },
        update: { state: 'PENDING', nextAttemptAt: new Date() },
      });
      await this.publish(id);
    }
  }

  private async publish(id: string) {
    const recording = await this.prisma.meetingRecording.findUniqueOrThrow({
      where: { id },
      include: { permissions: true },
    });
    this.realtime.emitMeetingEvent(
      recording.meetingId,
      MeetingEvent.RECORDING_UPDATED,
      {
        meetingId: recording.meetingId,
        recordingId: id,
        status: recording.status,
        startedAt: recording.startedAt,
        stoppedAt: recording.stoppedAt,
        version: recording.version,
      },
    );
    if (recording.status === 'COMPLETED' || recording.status === 'FAILED') {
      const event =
        recording.status === 'COMPLETED'
          ? MeetingEvent.RECORDING_READY
          : MeetingEvent.RECORDING_FAILED;
      for (const userId of new Set([
        recording.ownerId,
        ...recording.permissions.map((p) => p.userId),
      ]))
        this.realtime.emitUserEvent(userId, event, {
          recordingId: id,
        });
      await this.prisma.meetingRecordingJob.upsert({
        where: { recordingId_kind: { recordingId: id, kind: 'NOTIFY' } },
        create: { recordingId: id, kind: 'NOTIFY' },
        update: {},
      });
    }
  }

  private async notify(recording: MeetingRecording) {
    if (recording.status !== 'COMPLETED' && recording.status !== 'FAILED')
      return;
    const permissions = await this.prisma.meetingRecordingPermission.findMany({
      where: { recordingId: recording.id },
      select: { userId: true },
    });
    for (const recipientId of new Set([
      recording.ownerId,
      ...permissions.map((p) => p.userId),
    ])) {
      await lastValueFrom(
        this.kafka
          .emit('notification-topic', {
            key: recipientId,
            value: {
              recipientId,
              senderId: recording.ownerId,
              senderName: 'Meeting recordings',
              type: 'MEETING_UPDATED',
              title:
                recording.status === 'COMPLETED'
                  ? 'Recording ready'
                  : 'Recording failed',
              content: `${recording.title}: ${recording.status === 'COMPLETED' ? 'ready to watch' : 'could not be completed'}.`,
              link: `/meetings?tab=recordings`,
              metadata: {
                meetingId: recording.meetingId,
                recordingId: recording.id,
                eventId: `recording:${recording.id}:${recording.status}`,
                recordingStatus: recording.status,
              },
            },
          })
          .pipe(timeout(10_000)),
      );
    }
  }
}
