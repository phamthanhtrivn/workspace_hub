import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  MeetingEventTypeValue,
  MeetingParticipantStatusValue,
} from '../types/meeting.enums';

@Injectable()
export class MeetingAuditService {
  joinDecision(
    tx: Prisma.TransactionClient,
    meetingId: string,
    actorId: string,
    requesterId: string,
    type: MeetingEventTypeValue.JOIN_APPROVED | MeetingEventTypeValue.JOIN_REJECTED,
  ) {
    return tx.meetingEvent.create({
      data: {
        meetingId,
        actorId,
        type,
        metadata: { userId: requesterId },
      },
    });
  }

  joinRequestStateChanged(
    tx: Prisma.TransactionClient,
    meetingId: string,
    actorId: string,
    status: MeetingParticipantStatusValue,
  ) {
    return tx.meetingEvent.create({
      data: {
        meetingId,
        actorId,
        type:
          status === MeetingParticipantStatusValue.REQUESTED
            ? MeetingEventTypeValue.JOIN_REQUESTED
            : MeetingEventTypeValue.PARTICIPANT_JOINED,
        metadata: { status },
      },
    });
  }

  participantRoleUpdated(
    tx: Prisma.TransactionClient,
    meetingId: string,
    actorId: string,
    userId: string,
    role: string,
  ) {
    return tx.meetingEvent.create({
      data: {
        meetingId,
        actorId,
        type: MeetingEventTypeValue.PARTICIPANT_ROLE_UPDATED,
        metadata: { userId, role },
      },
    });
  }

  hostTransferred(
    tx: Prisma.TransactionClient,
    meetingId: string,
    oldHostId: string,
    newHostId: string,
  ) {
    return tx.meetingEvent.create({
      data: {
        meetingId,
        actorId: oldHostId,
        type: MeetingEventTypeValue.HOST_TRANSFERRED,
        metadata: { oldHostId, newHostId },
      },
    });
  }

  participantRemoved(
    tx: Prisma.TransactionClient,
    meetingId: string,
    actorId: string,
    removedUserId: string,
  ) {
    return tx.meetingEvent.create({
      data: {
        meetingId,
        actorId,
        type: MeetingEventTypeValue.PARTICIPANT_REMOVED,
        metadata: {
          removedUserId,
          status: MeetingParticipantStatusValue.REMOVED,
        },
      },
    });
  }

  accessUpdated(
    tx: Prisma.TransactionClient,
    meetingId: string,
    actorId: string,
    allowJoinWithoutApproval: boolean,
  ) {
    return tx.meetingEvent.create({
      data: {
        meetingId,
        actorId,
        type: MeetingEventTypeValue.ACCESS_UPDATED,
        metadata: { allowJoinWithoutApproval },
      },
    });
  }

  autoApprovedJoinRequests(
    tx: Prisma.TransactionClient,
    meetingId: string,
    actorId: string,
    userIds: string[],
  ) {
    return tx.meetingEvent.createMany({
      data: userIds.map((userId) => ({
        meetingId,
        actorId,
        type: MeetingEventTypeValue.JOIN_APPROVED,
        metadata: { userId },
      })),
    });
  }

  participantLeft(
    tx: Prisma.TransactionClient,
    meetingId: string,
    actorId: string,
  ) {
    return tx.meetingEvent.create({
      data: {
        meetingId,
        actorId,
        type: MeetingEventTypeValue.PARTICIPANT_LEFT,
      },
    });
  }

  meetingEnded(
    tx: Prisma.TransactionClient,
    meetingId: string,
    actorId: string,
  ) {
    return tx.meetingEvent.create({
      data: {
        meetingId,
        actorId,
        type: MeetingEventTypeValue.ENDED,
      },
    });
  }
}
