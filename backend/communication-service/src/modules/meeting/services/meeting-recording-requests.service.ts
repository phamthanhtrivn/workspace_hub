import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Meeting, MeetingParticipant, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingPolicyService } from './meeting-policy.service';
import { MeetingRealtimeService } from './meeting-realtime.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import { recordingError } from '../utils/meeting-recording.utils';

const REQUEST_TTL = 120_000;
const REQUEST_COOLDOWN = 60_000;

@Injectable()
export class MeetingRecordingRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: MeetingPolicyService,
    private readonly realtime: MeetingRealtimeService,
  ) {}

  async snapshot(meeting: Meeting, participant: MeetingParticipant) {
    const now = Date.now();
    const own = this.present(participant, now);
    const host =
      meeting.hostId === participant.userId && participant.role === 'HOST';
    const pending = host
      ? await this.prisma.meetingParticipant.findMany({
          where: {
            meetingId: meeting.id,
            role: 'PARTICIPANT',
            status: 'JOINED',
            canRecord: false,
            recordingRequestState: 'PENDING',
            recordingRequestedAt: { gt: new Date(now - REQUEST_TTL) },
          },
          orderBy: [{ recordingRequestedAt: 'asc' }, { id: 'asc' }],
          take: 50,
        })
      : [];
    const valid = pending.filter((item) => this.isPending(item, now));
    const profiles = valid.length
      ? await this.prisma.userProfileSnapshot.findMany({
          where: { userId: { in: valid.map((item) => item.userId) } },
          select: { userId: true, fullName: true, email: true },
        })
      : [];
    const names = new Map(
      profiles.map((item) => [item.userId, item.fullName || item.email]),
    );
    return {
      needsRecordingPermission:
        participant.role === 'PARTICIPANT' && !participant.canRecord,
      recordingRequest: own,
      canRequestRecording:
        participant.role === 'PARTICIPANT' &&
        !participant.canRecord &&
        own?.status !== 'PENDING' &&
        (!participant.recordingRequestedAt ||
          now - participant.recordingRequestedAt.getTime() >= REQUEST_COOLDOWN),
      recordingRequests: valid.map((item) => ({
        ...this.present(item, now)!,
        userId: item.userId,
        displayName: names.get(item.userId) || 'Meeting participant',
      })),
    };
  }

  async request(joinToken: string, userId: string) {
    const { meeting } = await this.policy.assertJoinedMeetingParticipant({
      joinToken,
      userId,
    });
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await this.lockMeeting(tx, meeting.id);
      const participant = await this.lockParticipant(tx, meeting.id, userId);
      if (
        current.status !== 'LIVE' ||
        participant.status !== 'JOINED' ||
        participant.role !== 'PARTICIPANT'
      )
        recordingError(
          403,
          'RECORDING_REQUEST_FORBIDDEN',
          'Only joined participants can request recording permission',
        );
      if (participant.canRecord)
        recordingError(
          409,
          'RECORDING_ALREADY_PERMITTED',
          'Recording permission is already granted',
        );
      const now = Date.now();
      if (this.isPending(participant, now))
        return { participant, created: false };
      if (
        participant.recordingRequestedAt &&
        now - participant.recordingRequestedAt.getTime() < REQUEST_COOLDOWN
      )
        recordingError(
          429,
          'RECORDING_REQUEST_COOLDOWN',
          'Please wait before requesting recording permission again',
        );
      return {
        created: true,
        participant: await tx.meetingParticipant.update({
          where: { id: participant.id },
          data: {
            recordingRequestId: randomUUID(),
            recordingRequestedAt: new Date(now),
            recordingRequestState: 'PENDING',
          },
        }),
      };
    });
    if (result.created) this.changed(meeting.id);
    return this.present(result.participant, Date.now());
  }

  async decide(
    joinToken: string,
    userId: string,
    requestId: string,
    approve: boolean,
  ) {
    const { meeting } = await this.policy.assertJoinedMeetingParticipant({
      joinToken,
      userId,
    });
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await this.lockMeeting(tx, meeting.id);
      const host = await this.lockParticipant(tx, meeting.id, userId);
      if (
        current.status !== 'LIVE' ||
        current.hostId !== userId ||
        host.status !== 'JOINED' ||
        host.role !== 'HOST'
      )
        recordingError(
          403,
          'RECORDING_REQUEST_FORBIDDEN',
          'Only the current joined host can answer recording requests',
        );
      const target = await tx.meetingParticipant.findUnique({
        where: { recordingRequestId: requestId },
      });
      if (!target || target.meetingId !== meeting.id)
        recordingError(
          404,
          'RECORDING_REQUEST_NOT_FOUND',
          'Recording request not found',
        );
      const participant = await this.lockParticipant(
        tx,
        meeting.id,
        target.userId,
      );
      const desired = approve ? 'APPROVED' : 'REJECTED';
      if (
        participant.recordingRequestId !== requestId ||
        participant.status !== 'JOINED' ||
        participant.role !== 'PARTICIPANT'
      )
        recordingError(
          409,
          'RECORDING_REQUEST_STALE',
          'The participant or request has changed',
        );
      if (participant.recordingRequestState === desired)
        return { participant, changed: false };
      if (!this.isPending(participant, Date.now()))
        recordingError(
          409,
          'RECORDING_REQUEST_STALE',
          'This recording request has expired or was already answered',
        );
      return {
        changed: true,
        participant: await tx.meetingParticipant.update({
          where: { id: participant.id },
          data: {
            recordingRequestState: desired,
            canRecord: approve,
            recordGrantedBy: approve ? userId : null,
          },
        }),
      };
    });
    if (result.changed) {
      this.changed(meeting.id);
      this.realtime.emitMeetingEvent(
        meeting.id,
        MeetingEvent.RECORDING_PERMISSION_UPDATED,
        {
          meetingId: meeting.id,
          userId: result.participant.userId,
          canRecord: approve,
        },
      );
    }
    return this.present(result.participant, Date.now());
  }

  private async lockMeeting(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM meetings WHERE id = ${id}::uuid FOR UPDATE`;
    return tx.meeting.findUniqueOrThrow({ where: { id } });
  }

  private async lockParticipant(
    tx: Prisma.TransactionClient,
    meetingId: string,
    userId: string,
  ) {
    await tx.$queryRaw`SELECT id FROM meeting_participants WHERE meeting_id = ${meetingId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
    return tx.meetingParticipant.findUniqueOrThrow({
      where: { meetingId_userId: { meetingId, userId } },
    });
  }

  private isPending(participant: MeetingParticipant, now: number) {
    return Boolean(
      participant.recordingRequestId &&
      participant.recordingRequestState === 'PENDING' &&
      participant.recordingRequestedAt &&
      participant.recordingRequestedAt.getTime() + REQUEST_TTL > now &&
      (!participant.joinedAt ||
        participant.recordingRequestedAt >= participant.joinedAt),
    );
  }

  private present(participant: MeetingParticipant, now: number) {
    if (
      !participant.recordingRequestId ||
      !participant.recordingRequestedAt ||
      !participant.recordingRequestState
    )
      return null;
    return {
      id: participant.recordingRequestId,
      status:
        participant.recordingRequestState === 'PENDING' &&
        !this.isPending(participant, now)
          ? 'EXPIRED'
          : participant.recordingRequestState,
      requestedAt: participant.recordingRequestedAt.toISOString(),
      expiresAt: new Date(
        participant.recordingRequestedAt.getTime() + REQUEST_TTL,
      ).toISOString(),
    };
  }

  private changed(meetingId: string) {
    // Broadcast only invalidation; names and request IDs are returned only to the host.
    this.realtime.emitMeetingEvent(
      meetingId,
      MeetingEvent.RECORDING_REQUEST_UPDATED,
      { meetingId },
    );
  }
}
