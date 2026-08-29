import { Injectable } from '@nestjs/common';
import {
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
} from '@prisma/client';
import { Socket } from 'socket.io';
import { CHAT_RESPONSE_STATUS } from '../../chat/types/chat.enums';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  getMeetingModeratorRoom,
  getMeetingParticipantRoom,
  getMeetingRealtimeRooms,
  getMeetingUserRoom,
} from '../utils/meeting-room.util';

@Injectable()
export class MeetingRealtimeHandler {
  constructor(private readonly prisma: PrismaService) {}

  async joinControlRooms(meetingId: string, userId: string, client: Socket) {
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
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: 'Meeting not found',
      };
    }

    const participant = meeting.participants[0];
    if (
      meeting.status !== MeetingStatus.LIVE ||
      !participant ||
      participant.status === MeetingParticipantStatus.REMOVED ||
      participant.status === MeetingParticipantStatus.REJECTED
    ) {
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: 'You are not allowed to join this meeting realtime room',
      };
    }

    client.join(getMeetingUserRoom(meetingId, userId));

    const isJoined = participant.status === MeetingParticipantStatus.JOINED;
    if (isJoined) {
      client.join(getMeetingParticipantRoom(meetingId));
    }

    const isModerator =
      isJoined &&
      (meeting.hostId === userId ||
        participant.role === MeetingRole.HOST ||
        participant.role === MeetingRole.COHOST);
    if (isModerator) {
      client.join(getMeetingModeratorRoom(meetingId));
    }

    return {
      status: CHAT_RESPONSE_STATUS.JOINED,
      meetingId,
      isModerator,
    };
  }

  leaveControlRooms(meetingId: string, userId: string, client: Socket) {
    getMeetingRealtimeRooms(meetingId, userId).forEach((room) => {
      client.leave(room);
    });

    return {
      status: CHAT_RESPONSE_STATUS.SUCCESS,
      meetingId,
    };
  }
}
