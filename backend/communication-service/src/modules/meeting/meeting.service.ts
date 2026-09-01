import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  MeetingEventType,
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
  MeetingType,
} from '@prisma/client';
import { LiveKitService } from '../../infrastructure/livekit/livekit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInstantMeetingDto } from './dto/create-instant-meeting.dto';
import { MEETING_ERROR_MESSAGES } from './types/meeting.enums';
import { createJoinToken, createRoomName } from './utils/meeting.utils';

interface CreateInstantMeetingParams {
  userId: string;
  userName?: string;
  avatarUrl?: string;
  dto?: CreateInstantMeetingDto;
}

@Injectable()
export class MeetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly liveKitService: LiveKitService,
  ) {}

  async createInstantMeeting({
    userId,
    userName,
    avatarUrl,
    dto,
  }: CreateInstantMeetingParams) {
    if (!userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    }

    if (!this.liveKitService.isConfigured()) {
      throw new ServiceUnavailableException(
        MEETING_ERROR_MESSAGES.LIVEKIT_NOT_CONFIGURED,
      );
    }

    const now = new Date();
    const instantMeetingDto = dto ?? {};
    const autoAdmit = instantMeetingDto.autoAdmit ?? true;
    const roomName = createRoomName();
    const joinToken = createJoinToken();

    await this.liveKitService.createRoom(roomName, {
      meetingType: MeetingType.INSTANT,
      createdBy: userId,
      autoAdmit,
    });

    const meeting = await this.prisma.$transaction(async (tx) => {
      const createdMeeting = await tx.meeting.create({
        data: {
          roomName,
          joinToken,
          type: MeetingType.INSTANT,
          status: MeetingStatus.LIVE,
          createdBy: userId,
          hostId: userId,
          autoAdmit,
          startedAt: now,
        },
      });

      await tx.meetingParticipant.create({
        data: {
          meetingId: createdMeeting.id,
          userId,
          role: MeetingRole.HOST,
          status: MeetingParticipantStatus.JOINED,
          joinedAt: now,
          lastSeenAt: now,
        },
      });

      await tx.meetingEvent.createMany({
        data: [
          {
            meetingId: createdMeeting.id,
            actorId: userId,
            type: MeetingEventType.CREATED,
            metadata: {
              roomName,
              joinToken,
            },
          },
          {
            meetingId: createdMeeting.id,
            actorId: userId,
            type: MeetingEventType.STARTED,
            metadata: {
              startedAt: now.toISOString(),
            },
          },
        ],
      });

      return createdMeeting;
    });

    const token = await this.liveKitService.createParticipantToken({
      roomName,
      userId,
      displayName: userName,
      avatarUrl,
      role: MeetingRole.HOST,
      deviceSettings: instantMeetingDto.deviceSettings,
    });

    return {
      meeting: {
        id: meeting.id,
        roomName: meeting.roomName,
        joinToken: meeting.joinToken,
        type: meeting.type,
        status: meeting.status,
        autoAdmit: meeting.autoAdmit,
        startedAt: meeting.startedAt?.toISOString() ?? null,
        createdAt: meeting.createdAt.toISOString(),
        participantRole: MeetingRole.HOST,
      },
      livekit: {
        serverUrl: this.liveKitService.getServerUrl(),
        token,
      },
    };
  }
}
