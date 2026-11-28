import { Injectable } from '@nestjs/common';
import { MeetingRecording, MeetingRecordingJob, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { S3Service } from '../../../infrastructure/s3/s3.service';
import { parseRecordingUploadState } from '../../../infrastructure/s3/recording-multipart-upload';
import { MeetingRecordingMediaService } from './meeting-recording-media.service';

export class RecordingJobPending extends Error {}

@Injectable()
export class MeetingRecordingSegmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly media: MeetingRecordingMediaService,
  ) {}

  async complete(
    recording: MeetingRecording,
    output: {
      egressId: string;
      size: bigint;
      duration: number;
      startedAt: Date | null;
      stoppedAt: Date;
      updatedAt: bigint;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.meetingRecording.updateMany({
        where: {
          id: recording.id,
          version: recording.version,
          livekitEgressId: recording.livekitEgressId,
        },
        data: {
          livekitEgressId: output.egressId,
          egressUpdatedAt: output.updatedAt,
          status:
            recording.pauseRequestedAt && !recording.stopRequestedAt
              ? 'PAUSED'
              : 'PROCESSING',
          failureCode:
            recording.pauseRequestedAt && !recording.stopRequestedAt
              ? null
              : 'MERGE_PENDING',
          startedAt: recording.startedAt ?? output.startedAt,
          stoppedAt: output.stoppedAt,
          segmentStartedAt: null,
          version: { increment: 1 },
        },
      });
      if (!changed.count) return false;
      await tx.meetingRecordingSegment.upsert({
        where: {
          recordingId_index: {
            recordingId: recording.id,
            index: recording.segmentIndex,
          },
        },
        create: {
          recordingId: recording.id,
          index: recording.segmentIndex,
          s3Key: recording.segmentKey!,
          livekitEgressId: output.egressId,
          sizeBytes: output.size,
          durationSeconds: output.duration,
          startedAt: output.startedAt,
          stoppedAt: output.stoppedAt,
        },
        update: {},
      });
      const total = await tx.meetingRecordingSegment.aggregate({
        where: { recordingId: recording.id },
        _sum: { durationSeconds: true },
      });
      await tx.meetingRecording.update({
        where: { id: recording.id },
        data: { durationSeconds: Math.floor(total._sum.durationSeconds ?? 0) },
      });
      if (!recording.pauseRequestedAt || recording.stopRequestedAt)
        await tx.meetingRecordingJob.upsert({
          where: {
            recordingId_kind: { recordingId: recording.id, kind: 'MERGE' },
          },
          create: { recordingId: recording.id, kind: 'MERGE' },
          update: {},
        });
      return true;
    });
  }

  async merge(
    recording: MeetingRecording,
    job: MeetingRecordingJob,
    leaseToken: string,
    signal: AbortSignal,
  ) {
    if (recording.status === 'COMPLETED') {
      await this.queueCleanup(recording.id);
      return false;
    }
    if (
      recording.status !== 'PROCESSING' ||
      recording.failureCode !== 'MERGE_PENDING' ||
      !recording.s3Key
    )
      return false;
    const parts = await this.prisma.meetingRecordingSegment.findMany({
      where: { recordingId: recording.id },
      orderBy: { index: 'asc' },
    });
    if (
      parts.length !== recording.segmentIndex + 1 ||
      parts.some((part, index) => part.index !== index)
    )
      throw new RecordingJobPending('Waiting for recording segments');
    signal.throwIfAborted();
    let size: bigint;
    if (parts.length === 1 && parts[0].sizeBytes <= 5n * 1024n ** 3n) {
      await this.s3.copyRecording(parts[0].s3Key, recording.s3Key, signal);
      size = parts[0].sizeBytes;
    } else {
      const path = await this.media.assemble(recording.id, parts, signal);
      size = await this.s3.uploadRecordingBackup(path, recording.s3Key, {
        state: parseRecordingUploadState(job.uploadState),
        signal,
        onCheckpoint: async (state) => {
          signal.throwIfAborted();
          const saved = await this.prisma.meetingRecordingJob.updateMany({
            where: {
              id: job.id,
              leaseToken,
              state: 'RUNNING',
              recording: { status: 'PROCESSING', failureCode: 'MERGE_PENDING' },
            },
            data: {
              uploadState: state
                ? (state as unknown as Prisma.InputJsonValue)
                : Prisma.DbNull,
            },
          });
          if (!saved.count) throw new Error('Recording merge lease lost');
        },
      });
    }
    signal.throwIfAborted();
    if (size <= 0n || (await this.s3.getFileSize(recording.s3Key)) !== size)
      throw new Error('Merged recording verification failed');
    signal.throwIfAborted();
    const changed = await this.prisma.$transaction(async (tx) => {
      const owned = await tx.meetingRecordingJob.updateMany({
        where: { id: job.id, leaseToken, state: 'RUNNING' },
        data: { leaseUntil: new Date(Date.now() + 120_000) },
      });
      if (!owned.count) throw new Error('Recording merge lease lost');
      const result = await tx.meetingRecording.updateMany({
        where: {
          id: recording.id,
          status: 'PROCESSING',
          failureCode: 'MERGE_PENDING',
          version: recording.version,
        },
        data: {
          status: 'COMPLETED',
          failureCode: null,
          completedAt: new Date(),
          sizeBytes: size,
          version: { increment: 1 },
        },
      });
      if (result.count) {
        for (const kind of ['NOTIFY', 'CLEANUP'])
          await tx.meetingRecordingJob.upsert({
            where: { recordingId_kind: { recordingId: recording.id, kind } },
            create: { recordingId: recording.id, kind },
            update: {},
          });
      }
      return result;
    });
    return Boolean(changed.count);
  }

  private async queueCleanup(recordingId: string) {
    await this.prisma.meetingRecordingJob.upsert({
      where: { recordingId_kind: { recordingId, kind: 'CLEANUP' } },
      create: { recordingId, kind: 'CLEANUP' },
      update: {},
    });
  }
}
