import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Meeting,
  MeetingParticipantStatus,
  MeetingRole,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingErrorMessage } from '../types/meeting.enums';

@Injectable()
export class MeetingAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async assertHost(meetingId: string, userId: string): Promise<Meeting> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      throw new NotFoundException(MeetingErrorMessage.MEETING_NOT_FOUND);
    }
    if (meeting.hostId !== userId) {
      throw new ForbiddenException(MeetingErrorMessage.HOST_REQUIRED);
    }
    return meeting;
  }

  async assertModerator(meetingId: string, userId: string): Promise<Meeting> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: {
          where: { userId },
          take: 1,
        },
      },
    });
    if (!meeting) {
      throw new NotFoundException(MeetingErrorMessage.MEETING_NOT_FOUND);
    }

    const participant = meeting.participants[0];
    const isHost = meeting.hostId === userId;
    const isCohost =
      participant?.role === MeetingRole.COHOST &&
      participant.status === MeetingParticipantStatus.JOINED;

    if (!isHost && !isCohost) {
      throw new ForbiddenException(MeetingErrorMessage.MODERATOR_REQUIRED);
    }

    const { participants, ...meetingData } = meeting;
    void participants;
    return meetingData;
  }

  async assertApprovedParticipant(meetingId: string, userId: string) {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        MeetingErrorMessage.PARTICIPANT_JOIN_REQUIRED,
      );
    }

    if (participant.status === MeetingParticipantStatus.REMOVED) {
      throw new ForbiddenException(MeetingErrorMessage.PARTICIPANT_REMOVED);
    }

    if (participant.status !== MeetingParticipantStatus.JOINED) {
      throw new ForbiddenException(
        MeetingErrorMessage.PARTICIPANT_JOIN_REQUIRED,
      );
    }

    return participant;
  }

  isModeratorRole(role: MeetingRole) {
    return role === MeetingRole.HOST || role === MeetingRole.COHOST;
  }
}
