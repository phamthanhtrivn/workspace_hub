import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import type { MeetingModeratorParams } from '../types/meeting.types';

@Injectable()
export class MeetingPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async assertMeetingModerator({ joinToken, userId }: MeetingModeratorParams) {
    if (!userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { joinToken },
      include: {
        participants: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException(MEETING_ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    if (meeting.status !== MeetingStatus.LIVE) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MEETING_NOT_LIVE);
    }

    const participant = meeting.participants[0];
    const isModerator =
      meeting.hostId === userId ||
      ((participant?.role === MeetingRole.HOST ||
        participant?.role === MeetingRole.COHOST) &&
        participant.status === MeetingParticipantStatus.JOINED);

    if (!isModerator) {
      throw new ForbiddenException(
        MEETING_ERROR_MESSAGES.MEETING_MODERATOR_REQUIRED,
      );
    }

    return { meeting, participant };
  }

  async assertMeetingHost({ joinToken, userId }: MeetingModeratorParams) {
    const { meeting, participant } = await this.assertJoinedMeetingParticipant({
      joinToken,
      userId,
    });
    const isHost =
      meeting.hostId === userId || participant.role === MeetingRole.HOST;

    if (!isHost) {
      throw new ForbiddenException(
        MEETING_ERROR_MESSAGES.MEETING_HOST_REQUIRED,
      );
    }

    return { meeting, participant };
  }

  async assertJoinedMeetingParticipant({
    joinToken,
    userId,
  }: MeetingModeratorParams) {
    if (!userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { joinToken },
      include: {
        participants: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException(MEETING_ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    if (meeting.status !== MeetingStatus.LIVE) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MEETING_NOT_LIVE);
    }

    const participant = meeting.participants[0];

    if (
      !participant ||
      participant.status !== MeetingParticipantStatus.JOINED
    ) {
      throw new ForbiddenException(
        MEETING_ERROR_MESSAGES.PARTICIPANT_NOT_JOINED,
      );
    }

    return { meeting, participant };
  }

  async getJoinedTargetParticipant({
    meetingId,
    targetUserId,
  }: {
    meetingId: string;
    targetUserId: string;
  }) {
    const targetParticipant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId: targetUserId,
        },
      },
    });

    if (!targetParticipant) {
      throw new NotFoundException(MEETING_ERROR_MESSAGES.PARTICIPANT_NOT_FOUND);
    }

    if (targetParticipant.status !== MeetingParticipantStatus.JOINED) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.PARTICIPANT_NOT_JOINED,
      );
    }

    return targetParticipant;
  }

  async getUserIdSearchFilter(search: string) {
    const snapshots = await this.prisma.userProfileSnapshot.findMany({
      where: {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { userId: true },
    });
    const userIds = snapshots.map((snapshot) => snapshot.userId);

    return userIds.length > 0 ? { in: userIds } : { in: [] };
  }
}
