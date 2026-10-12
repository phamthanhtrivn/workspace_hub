import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { MeetingRecordingStatus, MeetingRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import { S3Service } from '../../../infrastructure/s3/s3.service';
import { MeetingPolicyService } from './meeting-policy.service';
import { MeetingRealtimeService } from './meeting-realtime.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import {
  ListRecordingsDto,
  StartMeetingRecordingDto,
  RecordingSettingsDto,
} from '../dto/meeting-recording.dto';
import {
  ACTIVE_RECORDING_STATUSES,
  RECORDING_CAPACITY_STATUSES,
  recordingSegmentKey,
  recordingCapabilities,
  recordingError,
} from '../utils/meeting-recording.utils';
import { MeetingRecordingMediaService } from './meeting-recording-media.service';
import { MeetingRecordingRequestsService } from './meeting-recording-requests.service';

const recordingInclude = {
  meeting: { select: { title: true, joinToken: true } },
  permissions: { select: { userId: true, canDownload: true } },
} satisfies Prisma.MeetingRecordingInclude;
type RecordingWithAccess = Prisma.MeetingRecordingGetPayload<{
  include: typeof recordingInclude;
}>;
type RecordingAccessGrant = {
  recordingId: string;
  grantedBy: string;
  canDownload: boolean;
};

const RECORDING_PERMISSION_BATCH_SIZE = 500;
const RECORDING_SHARE_TRANSACTION_TIMEOUT_MS = 15_000;

@Injectable()
export class MeetingRecordingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly liveKit: LiveKitService,
    private readonly s3: S3Service,
    private readonly policy: MeetingPolicyService,
    private readonly realtime: MeetingRealtimeService,
    private readonly media?: MeetingRecordingMediaService,
    private readonly requests?: MeetingRecordingRequestsService,
  ) {}

  async status(joinToken: string, userId: string) {
    const { meeting, participant } =
      await this.policy.assertJoinedMeetingParticipant({ joinToken, userId });
    const recording = await this.prisma.meetingRecording.findFirst({
      where: {
        meetingId: meeting.id,
        status: { in: ACTIVE_RECORDING_STATUSES },
      },
    });
    const available = this.liveKit.isRecordingConfigured();
    const capabilities = recordingCapabilities(participant, recording, userId);
    return {
      ...(await this.requests?.snapshot(meeting, participant)),
      meetingId: meeting.id,
      ownerId: meeting.createdBy,
      settings: {
        autoRecord: meeting.autoRecord,
        layout: meeting.recordingLayout,
      },
      pauseAvailable: Boolean(this.media?.isAvailable()),
      customLayoutsAvailable: Boolean(
        process.env.LIVEKIT_RECORDING_TEMPLATE_URL,
      ),
      recordingAvailable: available,
      unavailableReason: available
        ? null
        : 'Recording service is not configured',
      recording: recording
        ? {
            id: recording.id,
            status: recording.status,
            startedAt: recording.startedAt,
            stoppedAt: recording.stoppedAt,
            stopRequestedAt: recording.stopRequestedAt,
            version: recording.version,
            layout: recording.layout,
            recordedSeconds: recording.durationSeconds ?? 0,
            segmentStartedAt: recording.segmentStartedAt,
          }
        : null,
      capabilities: {
        ...capabilities,
        canStart: available && capabilities.canStart,
        canPause: Boolean(
          capabilities.canStop &&
          recording?.status === 'RECORDING' &&
          recording.segmentKey &&
          this.media?.isAvailable(),
        ),
        canResume: Boolean(
          capabilities.canStop &&
          recording?.status === 'PAUSED' &&
          this.media?.isAvailable(),
        ),
      },
    };
  }

  async start(
    joinToken: string,
    userId: string,
    dto: StartMeetingRecordingDto,
    key?: string,
    automatic = false,
  ) {
    const { meeting } = await this.policy.assertJoinedMeetingParticipant({
      joinToken,
      userId,
    });
    const requestKey = this.requestKey(userId, meeting.id, 'START', key);
    const layout = dto.layout ?? 'speaker';
    if (layout === 'screen' && !process.env.LIVEKIT_RECORDING_TEMPLATE_URL)
      recordingError(
        503,
        'RECORDING_LAYOUT_UNAVAILABLE',
        'Screen-only recording is not configured',
      );
    const requestHash = createHash('sha256').update(layout).digest('hex');
    const existing = await this.prisma.meetingRecordingJob.findUnique({
      where: { requestKey },
    });
    if (existing) return this.replay(existing, userId, requestHash);
    if (!this.liveKit.isRecordingConfigured())
      recordingError(
        503,
        'RECORDING_UNAVAILABLE',
        'Recording service is not configured',
      );

    const id = randomUUID();
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM meetings WHERE id = ${meeting.id}::uuid FOR UPDATE`;
        const current = await tx.meeting.findUniqueOrThrow({
          where: { id: meeting.id },
        });
        const participant = await tx.meetingParticipant.findUnique({
          where: { meetingId_userId: { meetingId: meeting.id, userId } },
        });
        if (current.status !== 'LIVE')
          recordingError(409, 'MEETING_NOT_LIVE', 'Meeting is not live');
        if (!recordingCapabilities(participant ?? undefined).canStart)
          recordingError(
            403,
            'RECORDING_FORBIDDEN',
            'You cannot record this meeting',
          );
        if (
          automatic &&
          (!current.autoRecord ||
            (await tx.meetingRecording.count({
              where: { meetingId: meeting.id },
            })) > 0)
        )
          recordingError(
            409,
            'AUTO_RECORDING_SKIPPED',
            'Automatic recording is disabled or has already run',
          );
        const active = await tx.meetingRecording.findFirst({
          where: {
            meetingId: meeting.id,
            status: { in: ACTIVE_RECORDING_STATUSES },
          },
        });
        if (active)
          recordingError(
            409,
            'RECORDING_ALREADY_ACTIVE',
            'A recording is already active or processing',
          );
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(61009001)`;
        const activeCount = await tx.meetingRecording.count({
          where: { status: { in: RECORDING_CAPACITY_STATUSES } },
        });
        if (
          activeCount >=
          Number(process.env.MEETING_RECORDING_MAX_CONCURRENT || 1)
        )
          recordingError(
            429,
            'RECORDING_CAPACITY',
            'Recording capacity reached; try again later',
          );
        const title = `${meeting.title} — recording`;
        await tx.meetingRecording.create({
          data: {
            id,
            meetingId: meeting.id,
            ownerId: meeting.createdBy,
            startedBy: userId,
            status: MeetingRecordingStatus.STARTING,
            title,
            layout,
            segmentKey: this.media?.isAvailable()
              ? recordingSegmentKey(meeting.id, id, 0)
              : null,
            controlRequestedBy: userId,
            durationSeconds: 0,
            s3Key: `recordings/${meeting.id}/${id}.mp4`,
            fileName: `${id}.mp4`,
            mimeType: 'video/mp4',
            jobs: { create: { kind: 'START', requestKey, requestHash } },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await this.prisma.meetingRecordingJob.findUnique({
          where: { requestKey },
        });
        if (duplicate) return this.replay(duplicate, userId, requestHash);
        recordingError(
          409,
          'RECORDING_ALREADY_ACTIVE',
          'A recording is already active',
        );
      }
      throw error;
    }
    this.realtime.emitMeetingEvent(meeting.id, MeetingEvent.RECORDING_UPDATED, {
      meetingId: meeting.id,
      recordingId: id,
      status: 'STARTING',
      version: 0,
    });
    return { id, status: MeetingRecordingStatus.STARTING };
  }

  async stop(
    joinToken: string,
    userId: string,
    recordingId: string,
    key?: string,
  ) {
    const { meeting } = await this.policy.assertJoinedMeetingParticipant({
      joinToken,
      userId,
    });
    const requestKey = this.requestKey(userId, meeting.id, 'STOP', key);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM meetings WHERE id = ${meeting.id}::uuid FOR UPDATE`;
      const recording = await tx.meetingRecording.findUnique({
        where: { id: recordingId },
      });
      if (!recording || recording.meetingId !== meeting.id)
        recordingError(404, 'RECORDING_NOT_FOUND', 'Recording not found');
      const participant = await tx.meetingParticipant.findUnique({
        where: { meetingId_userId: { meetingId: meeting.id, userId } },
      });
      const caps = recordingCapabilities(
        participant ?? undefined,
        { ...recording, stopRequestedAt: null },
        userId,
      );
      if (!caps.canStop)
        recordingError(
          403,
          'RECORDING_FORBIDDEN',
          'You cannot stop this recording',
        );
      const duplicate = await tx.meetingRecordingJob.findUnique({
        where: { requestKey },
      });
      if (duplicate && duplicate.recordingId !== recordingId)
        recordingError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This key was used for another recording',
        );
      if (
        !ACTIVE_RECORDING_STATUSES.includes(recording.status) ||
        recording.stopRequestedAt
      )
        return { id: recording.id, status: recording.status };
      await tx.meetingRecording.update({
        where: { id: recordingId },
        data: {
          stopRequestedAt: new Date(),
          stoppedBy: userId,
          status: 'PROCESSING',
          version: { increment: 1 },
        },
      });
      await tx.meetingRecordingJob.upsert({
        where: { recordingId_kind: { recordingId, kind: 'STOP' } },
        create: { recordingId, kind: 'STOP', requestKey },
        update: {
          state: 'PENDING',
          attempts: 0,
          leaseToken: null,
          leaseUntil: null,
          nextAttemptAt: new Date(),
        },
      });
      if (recording.segmentKey && recording.status === 'PAUSED') {
        await tx.meetingRecording.update({
          where: { id: recordingId },
          data: { failureCode: 'MERGE_PENDING' },
        });
        await tx.meetingRecordingJob.upsert({
          where: { recordingId_kind: { recordingId, kind: 'MERGE' } },
          create: { recordingId, kind: 'MERGE' },
          update: {},
        });
      }
      return { id: recordingId, status: MeetingRecordingStatus.PROCESSING };
    });
  }

  async configure(
    joinToken: string,
    userId: string,
    dto: RecordingSettingsDto,
  ) {
    const { meeting } = await this.policy.assertMeetingHost({
      joinToken,
      userId,
    });
    if (dto.layout === 'screen' && !process.env.LIVEKIT_RECORDING_TEMPLATE_URL)
      recordingError(
        503,
        'RECORDING_LAYOUT_UNAVAILABLE',
        'Screen-only recording is not configured',
      );
    const settings = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM meetings WHERE id = ${meeting.id}::uuid FOR UPDATE`;
      const current = await tx.meeting.findUniqueOrThrow({
        where: { id: meeting.id },
      });
      const actor = await tx.meetingParticipant.findUnique({
        where: { meetingId_userId: { meetingId: meeting.id, userId } },
      });
      if (
        actor?.status !== 'JOINED' ||
        actor.role !== 'HOST' ||
        current.hostId !== userId
      )
        recordingError(
          403,
          'RECORDING_FORBIDDEN',
          'Only the joined host can change recording settings',
        );
      if (current.status !== 'LIVE')
        recordingError(409, 'MEETING_NOT_LIVE', 'Meeting is not live');
      return tx.meeting.update({
        where: { id: meeting.id },
        data: {
          autoRecord: dto.autoRecord,
          recordingLayout: dto.layout,
        },
      });
    });
    this.realtime.emitMeetingEvent(meeting.id, MeetingEvent.RECORDING_UPDATED, {
      meetingId: meeting.id,
    });
    return {
      autoRecord: settings.autoRecord,
      layout: settings.recordingLayout,
    };
  }

  async pause(joinToken: string, userId: string, id: string, key?: string) {
    return this.transition(joinToken, userId, id, 'PAUSE', key);
  }

  async resume(joinToken: string, userId: string, id: string, key?: string) {
    return this.transition(joinToken, userId, id, 'RESUME', key);
  }

  private async transition(
    joinToken: string,
    userId: string,
    id: string,
    operation: 'PAUSE' | 'RESUME',
    key?: string,
  ) {
    const { meeting } = await this.policy.assertJoinedMeetingParticipant({
      joinToken,
      userId,
    });
    const requestKey = this.requestKey(userId, meeting.id, operation, key);
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM meetings WHERE id = ${meeting.id}::uuid FOR UPDATE`;
      const current = await tx.meeting.findUniqueOrThrow({
        where: { id: meeting.id },
      });
      const recording = await tx.meetingRecording.findUnique({ where: { id } });
      if (!recording || recording.meetingId !== meeting.id)
        recordingError(404, 'RECORDING_NOT_FOUND', 'Recording not found');
      const actor = await tx.meetingParticipant.findUnique({
        where: { meetingId_userId: { meetingId: meeting.id, userId } },
      });
      if (!recordingCapabilities(actor ?? undefined, recording, userId).canStop)
        recordingError(
          403,
          'RECORDING_FORBIDDEN',
          'You cannot control this recording',
        );
      if (current.status !== 'LIVE')
        recordingError(409, 'MEETING_NOT_LIVE', 'Meeting is not live');
      const previous = await tx.meetingRecordingJob.findUnique({
        where: { requestKey },
      });
      if (previous) {
        if (previous.recordingId !== id)
          recordingError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'This key was used for another recording',
          );
        return { id, status: recording.status };
      }
      if (!this.media?.isAvailable() || !recording.segmentKey)
        recordingError(
          503,
          'RECORDING_PAUSE_UNAVAILABLE',
          'Pause/Resume is unavailable for this recording',
        );
      const expected = operation === 'PAUSE' ? 'RECORDING' : 'PAUSED';
      if (recording.status !== expected)
        recordingError(
          409,
          'RECORDING_STATE_CONFLICT',
          `Recording must be ${expected.toLowerCase()}`,
        );
      if (operation === 'RESUME') {
        if (!this.liveKit.isRecordingConfigured())
          recordingError(
            503,
            'RECORDING_UNAVAILABLE',
            'Recording service is unavailable',
          );
        if (recording.segmentIndex >= 99)
          recordingError(
            429,
            'RECORDING_SEGMENT_LIMIT',
            'Recording pause limit reached',
          );
        if (
          (recording.durationSeconds ?? 0) >=
          Number(process.env.MEETING_RECORDING_MAX_MINUTES || 120) * 60
        )
          recordingError(
            409,
            'RECORDING_DURATION_LIMIT',
            'Recording duration limit reached',
          );
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(61009001)`;
        const count = await tx.meetingRecording.count({
          where: { status: { in: RECORDING_CAPACITY_STATUSES } },
        });
        if (count >= Number(process.env.MEETING_RECORDING_MAX_CONCURRENT || 1))
          recordingError(
            429,
            'RECORDING_CAPACITY',
            'Recording capacity reached; try again later',
          );
      }
      const status =
        operation === 'PAUSE'
          ? MeetingRecordingStatus.PAUSING
          : MeetingRecordingStatus.STARTING;
      await tx.meetingRecording.update({
        where: { id },
        data:
          operation === 'PAUSE'
            ? {
                status,
                pauseRequestedAt: new Date(),
                version: { increment: 1 },
              }
            : {
                status,
                pauseRequestedAt: null,
                livekitEgressId: null,
                egressUpdatedAt: 0n,
                segmentIndex: { increment: 1 },
                segmentStartedAt: null,
                segmentDurationSeconds: null,
                stoppedAt: null,
                controlRequestedBy: userId,
                segmentKey: recordingSegmentKey(
                  meeting.id,
                  id,
                  recording.segmentIndex + 1,
                ),
                failureCode: null,
                version: { increment: 1 },
              },
      });
      const kind = operation === 'PAUSE' ? 'STOP' : 'START';
      await tx.meetingRecordingJob.upsert({
        where: { recordingId_kind: { recordingId: id, kind } },
        create: { recordingId: id, kind },
        update: {
          state: 'PENDING',
          attempts: 0,
          nextAttemptAt: new Date(),
          leaseToken: null,
          leaseUntil: null,
          dispatchedAt: null,
        },
      });
      await tx.meetingRecordingJob.create({
        data: {
          recordingId: id,
          kind: `${operation}:${createHash('sha256').update(requestKey).digest('hex')}`,
          requestKey,
          state: 'DONE',
        },
      });
      return { id, status };
    });
    this.realtime.emitMeetingEvent(meeting.id, MeetingEvent.RECORDING_UPDATED, {
      meetingId: meeting.id,
      recordingId: id,
      status: result.status,
    });
    return result;
  }

  async grantRecording(
    joinToken: string,
    userId: string,
    targetUserId: string,
    canRecord: boolean,
  ) {
    const { meeting } = await this.policy.assertMeetingHost({
      joinToken,
      userId,
    });
    const target = await this.policy.getJoinedTargetParticipant({
      meetingId: meeting.id,
      targetUserId,
    });
    if (target.role !== MeetingRole.PARTICIPANT)
      recordingError(
        400,
        'RECORDING_PERMISSION_INVALID',
        'Hosts and co-hosts already have recording permission',
      );
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM meetings WHERE id = ${meeting.id}::uuid FOR UPDATE`;
      const current = await tx.meeting.findUniqueOrThrow({
        where: { id: meeting.id },
      });
      const actor = await tx.meetingParticipant.findUnique({
        where: { meetingId_userId: { meetingId: meeting.id, userId } },
      });
      if (
        current.status !== 'LIVE' ||
        current.hostId !== userId ||
        actor?.status !== 'JOINED'
      )
        recordingError(
          403,
          'RECORDING_FORBIDDEN',
          'Only the joined host can grant recording',
        );
      const result = await tx.meetingParticipant.updateMany({
        where: { id: target.id, status: 'JOINED', role: 'PARTICIPANT' },
        data: { canRecord, recordGrantedBy: canRecord ? userId : null },
      });
      if (!result.count)
        recordingError(
          409,
          'PARTICIPANT_CHANGED',
          'Participant has left or changed role',
        );
      await tx.meetingParticipant.updateMany({
        where: { id: target.id, recordingRequestState: 'PENDING' },
        data: { recordingRequestState: canRecord ? 'APPROVED' : 'REJECTED' },
      });
      return tx.meetingParticipant.findUniqueOrThrow({
        where: { id: target.id },
      });
    });
    const payload = {
      meetingId: meeting.id,
      userId: targetUserId,
      canRecord: updated.canRecord,
    };
    this.realtime.emitMeetingEvent(
      meeting.id,
      MeetingEvent.RECORDING_PERMISSION_UPDATED,
      payload,
    );
    this.realtime.emitMeetingEvent(
      meeting.id,
      MeetingEvent.RECORDING_REQUEST_UPDATED,
      { meetingId: meeting.id },
    );
    return payload;
  }

  async list(userId: string, query: ListRecordingsDto, joinToken?: string) {
    let meetingId = query.meetingId;
    if (joinToken) {
      const meeting = await this.prisma.meeting.findUnique({
        where: { joinToken },
        select: { id: true },
      });
      if (!meeting)
        recordingError(404, 'MEETING_NOT_FOUND', 'Meeting not found');
      meetingId = meeting.id;
    }
    const access: Prisma.MeetingRecordingWhereInput =
      query.scope === 'owned'
        ? { ownerId: userId }
        : query.scope === 'shared'
          ? { ownerId: { not: userId }, permissions: { some: { userId } } }
          : {
              OR: [{ ownerId: userId }, { permissions: { some: { userId } } }],
            };
    const where: Prisma.MeetingRecordingWhereInput = {
      AND: [access, { status: { not: 'DELETED' } }],
      meetingId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim()
        ? { title: { contains: query.search.trim(), mode: 'insensitive' } }
        : {}),
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [total, recordings] = await this.prisma.$transaction([
      this.prisma.meetingRecording.count({ where }),
      this.prisma.meetingRecording.findMany({
        where,
        include: {
          ...recordingInclude,
          permissions: { ...recordingInclude.permissions, where: { userId } },
        },
        orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      items: recordings.map((recording) => this.present(recording, userId)),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async detail(id: string, userId: string) {
    return this.present(await this.assertAccess(id, userId), userId);
  }

  async url(id: string, userId: string, download: boolean) {
    const recording = await this.assertAccess(id, userId);
    if (download && !this.present(recording, userId).capabilities.canDownload)
      recordingError(403, 'RECORDING_FORBIDDEN', 'Downloading is not allowed');
    if (recording.status !== 'COMPLETED' || !recording.s3Key)
      recordingError(409, 'RECORDING_NOT_READY', 'Recording is not ready');
    return this.s3.generateRecordingUrl(recording.s3Key, download);
  }

  async rename(id: string, userId: string, title: string) {
    await this.assertOwner(id, userId);
    if (!title.trim())
      recordingError(400, 'INVALID_TITLE', 'Title cannot be blank');
    await this.prisma.meetingRecording.update({
      where: { id },
      data: { title: title.trim() },
    });
    return this.detail(id, userId);
  }

  async permissions(id: string, userId: string) {
    const permissions = (await this.assertOwner(id, userId, true)).permissions;
    if (!permissions.length) return [];
    const profiles = await this.prisma.userProfileSnapshot.findMany({
      where: { userId: { in: permissions.map((p) => p.userId) } },
      select: { userId: true, fullName: true, email: true },
    });
    const profileById = new Map(
      profiles.map((profile) => [profile.userId, profile]),
    );
    return permissions.map((permission) => ({
      userId: permission.userId,
      canDownload: permission.canDownload,
      profile: profileById.get(permission.userId) ?? null,
    }));
  }

  async share(
    id: string,
    userId: string,
    targetUserId: string,
    canDownload: boolean,
  ) {
    const recording = await this.assertOwner(id, userId);
    if (targetUserId === recording.ownerId)
      recordingError(
        400,
        'RECORDING_PERMISSION_INVALID',
        'The owner already has full access',
      );
    const account = await this.prisma.userProfileSnapshot.findUnique({
      where: { userId: targetUserId },
    });
    if (!account) recordingError(404, 'USER_NOT_FOUND', 'User not found');
    const permission = await this.prisma.$transaction(async (tx) => {
      await this.lockOwnedRecording(tx, id, userId);
      return tx.meetingRecordingPermission.upsert({
        where: {
          recordingId_userId: { recordingId: id, userId: targetUserId },
        },
        create: {
          recordingId: id,
          userId: targetUserId,
          grantedBy: userId,
          canDownload,
        },
        update: { canDownload, grantedBy: userId },
      });
    });
    this.realtime.emitUserEvent(
      targetUserId,
      MeetingEvent.RECORDING_ACCESS_UPDATED,
      { recordingId: id },
    );
    return permission;
  }

  async shareParticipants(id: string, userId: string, canDownload: boolean) {
    const recording = await this.assertOwner(id, userId);
    const recipientIds = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM meetings WHERE id = ${recording.meetingId}::uuid FOR UPDATE`;
        const current = await this.lockOwnedRecording(tx, id, userId);
        const cutoff = current.stopRequestedAt ?? current.stoppedAt;
        if (!cutoff)
          recordingError(
            409,
            'RECORDING_NOT_READY',
            'Stop recording before sharing with attendees',
          );
        // Lock recipients so removal either precedes this grant or revokes it afterwards.
        const recipients = await tx.$queryRaw<{ userId: string }[]>`
        SELECT p.user_id AS "userId" FROM meeting_participants p
        WHERE p.meeting_id = ${recording.meetingId}::uuid
          AND p.user_id <> ${userId}::uuid AND p.status <> 'REMOVED'
          AND (p.joined_at <= ${cutoff} OR EXISTS (
            SELECT 1 FROM meeting_events e WHERE e.meeting_id = p.meeting_id
              AND e.actor_id = p.user_id AND e.type = 'PARTICIPANT_JOINED'
              AND e.created_at <= ${cutoff}
          ))
        ORDER BY p.id FOR UPDATE OF p`;
        const ids = recipients.map((recipient) => recipient.userId);
        if (!ids.length) return ids;
        const accountCount = await tx.userProfileSnapshot.count({
          where: { userId: { in: ids } },
        });
        if (accountCount !== ids.length)
          recordingError(
            404,
            'USER_NOT_FOUND',
            'An attendee account is unavailable',
          );
        await this.upsertAttendeePermissions(tx, ids, {
          recordingId: id,
          grantedBy: userId,
          canDownload,
        });
        return ids;
      },
      { timeout: RECORDING_SHARE_TRANSACTION_TIMEOUT_MS },
    );
    for (const recipientId of recipientIds)
      this.realtime.emitUserEvent(
        recipientId,
        MeetingEvent.RECORDING_ACCESS_UPDATED,
        { recordingId: id },
      );
    return { sharedCount: recipientIds.length };
  }

  async revoke(id: string, userId: string, targetUserId: string) {
    await this.assertOwner(id, userId);
    await this.prisma.$transaction(async (tx) => {
      await this.lockOwnedRecording(tx, id, userId);
      await tx.meetingRecordingPermission.deleteMany({
        where: { recordingId: id, userId: targetUserId },
      });
    });
    this.realtime.emitUserEvent(
      targetUserId,
      MeetingEvent.RECORDING_ACCESS_UPDATED,
      { recordingId: id },
    );
    return { revoked: true };
  }

  async delete(id: string, userId: string) {
    const recording = await this.assertAccess(id, userId, true);
    if (recording.ownerId !== userId)
      recordingError(
        403,
        'RECORDING_FORBIDDEN',
        'Only the owner can delete recordings',
      );
    const recipientIds = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM meeting_recordings WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await tx.meetingRecording.findUniqueOrThrow({
        where: { id },
      });
      if (ACTIVE_RECORDING_STATUSES.includes(current.status))
        recordingError(
          409,
          'RECORDING_ALREADY_ACTIVE',
          'Stop and finish processing before deleting',
        );
      const permissions = await tx.meetingRecordingPermission.findMany({
        where: { recordingId: id },
        select: { userId: true },
      });
      await tx.meetingRecording.update({
        where: { id },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          version: { increment: 1 },
        },
      });
      await tx.meetingRecordingPermission.deleteMany({
        where: { recordingId: id },
      });
      await tx.meetingRecordingJob.upsert({
        where: { recordingId_kind: { recordingId: id, kind: 'DELETE' } },
        create: { recordingId: id, kind: 'DELETE' },
        update: {},
      });
      return permissions.map((permission) => permission.userId);
    });
    for (const recipient of new Set([userId, ...recipientIds]))
      this.realtime.emitUserEvent(recipient, MeetingEvent.RECORDING_DELETED, {
        recordingId: id,
      });
    return { id, status: 'DELETED' };
  }

  private async assertAccess(
    id: string,
    userId: string,
    allowDeleted = false,
    allPermissions = false,
  ): Promise<RecordingWithAccess> {
    const recording = await this.prisma.meetingRecording.findUnique({
      where: { id },
      include: {
        ...recordingInclude,
        permissions: {
          ...recordingInclude.permissions,
          ...(allPermissions ? {} : { where: { userId } }),
        },
      },
    });
    if (
      !recording ||
      (!allowDeleted && recording.status === 'DELETED') ||
      (recording.ownerId !== userId &&
        !recording.permissions.some((p) => p.userId === userId))
    )
      recordingError(404, 'RECORDING_NOT_FOUND', 'Recording not found');
    return recording;
  }

  private async assertOwner(
    id: string,
    userId: string,
    allPermissions = false,
  ) {
    const recording = await this.assertAccess(
      id,
      userId,
      false,
      allPermissions,
    );
    if (recording.ownerId !== userId)
      recordingError(
        403,
        'RECORDING_FORBIDDEN',
        'Only the owner can manage recordings',
      );
    return recording;
  }

  private async lockOwnedRecording(
    tx: Prisma.TransactionClient,
    id: string,
    userId: string,
  ) {
    await tx.$queryRaw`SELECT id FROM meeting_recordings WHERE id = ${id}::uuid FOR UPDATE`;
    const recording = await tx.meetingRecording.findUniqueOrThrow({
      where: { id },
    });
    if (recording.status === 'DELETED')
      recordingError(404, 'RECORDING_NOT_FOUND', 'Recording not found');
    if (recording.ownerId !== userId)
      recordingError(
        403,
        'RECORDING_FORBIDDEN',
        'Only the owner can manage recordings',
      );
    return recording;
  }

  private async upsertAttendeePermissions(
    tx: Prisma.TransactionClient,
    recipientIds: string[],
    grant: RecordingAccessGrant,
  ) {
    const now = new Date();
    for (
      let offset = 0;
      offset < recipientIds.length;
      offset += RECORDING_PERMISSION_BATCH_SIZE
    ) {
      const values = recipientIds
        .slice(offset, offset + RECORDING_PERMISSION_BATCH_SIZE)
        .map(
          (recipientId) => Prisma.sql`
          (${randomUUID()}::uuid, ${grant.recordingId}::uuid, ${recipientId}::uuid,
            ${grant.grantedBy}::uuid, ${grant.canDownload}, ${now}, ${now})`,
        );
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO meeting_recording_permissions
          (id, recording_id, user_id, granted_by, can_download, created_at, updated_at)
        VALUES ${Prisma.join(values)}
        ON CONFLICT (recording_id, user_id) DO UPDATE SET
          can_download = EXCLUDED.can_download,
          granted_by = EXCLUDED.granted_by, updated_at = EXCLUDED.updated_at`);
    }
  }

  private present(recording: RecordingWithAccess, userId: string) {
    const owner = recording.ownerId === userId;
    return {
      id: recording.id,
      meetingId: recording.meetingId,
      joinToken: recording.meeting.joinToken,
      meetingTitle: recording.meeting.title,
      title: recording.title,
      ownerId: recording.ownerId,
      startedBy: recording.startedBy,
      stoppedBy: recording.stoppedBy,
      status: recording.status,
      layout: recording.layout,
      requestedAt: recording.requestedAt,
      startedAt: recording.startedAt,
      stoppedAt: recording.stoppedAt,
      completedAt: recording.completedAt,
      durationSeconds: recording.durationSeconds,
      sizeBytes: recording.sizeBytes?.toString() ?? null,
      failureCode: recording.failureCode,
      version: recording.version,
      capabilities: {
        canView: true,
        canDownload:
          owner ||
          Boolean(
            recording.permissions.find((p) => p.userId === userId)?.canDownload,
          ),
        canManage: owner,
      },
    };
  }

  private requestKey(
    userId: string,
    meetingId: string,
    kind: string,
    key?: string,
  ) {
    if (!key || key.length > 128 || !/^[A-Za-z0-9_-]+$/.test(key))
      recordingError(
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'A valid Idempotency-Key header is required',
      );
    return `${userId}:${meetingId}:${kind}:${key}`;
  }

  private async replay(
    job: { recordingId: string; requestHash: string | null },
    userId: string,
    hash: string,
  ) {
    if (job.requestHash !== hash)
      recordingError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'This key was used for a different request',
      );
    const recording = await this.prisma.meetingRecording.findUniqueOrThrow({
      where: { id: job.recordingId },
    });
    if (recording.startedBy !== userId)
      recordingError(403, 'RECORDING_FORBIDDEN', 'Recording access denied');
    return { id: recording.id, status: recording.status };
  }
}
