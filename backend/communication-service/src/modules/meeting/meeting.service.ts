import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
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

interface JoinMeetingParams extends CreateInstantMeetingParams {
  joinToken: string;
}

interface GetMeetingAccessParams {
  joinToken: string;
  userId: string;
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

    return this.toMeetingRoomResponse(meeting, MeetingRole.HOST, token);
  }

  async getMeetingAccess({ joinToken, userId }: GetMeetingAccessParams) {
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

    const existingParticipant = meeting.participants[0];
    const participantRole =
      existingParticipant?.role ??
      (meeting.hostId === userId ? MeetingRole.HOST : MeetingRole.PARTICIPANT);

    return {
      joinToken: meeting.joinToken,
      status: meeting.status,
      autoAdmit: meeting.autoAdmit,
      participantRole,
    };
  }

  async joinMeeting({
    joinToken,
    userId,
    userName,
    avatarUrl,
    dto,
  }: JoinMeetingParams) {
    if (!userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    }

    if (!this.liveKitService.isConfigured()) {
      throw new ServiceUnavailableException(
        MEETING_ERROR_MESSAGES.LIVEKIT_NOT_CONFIGURED,
      );
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

    const existingParticipant = meeting.participants[0];

    if (!meeting.autoAdmit && !existingParticipant && meeting.hostId !== userId) {
      throw new ForbiddenException(
        MEETING_ERROR_MESSAGES.MEETING_JOIN_REQUIRES_APPROVAL,
      );
    }

    const now = new Date();
    const role =
      existingParticipant?.role ??
      (meeting.hostId === userId ? MeetingRole.HOST : MeetingRole.PARTICIPANT);

    await this.prisma.meetingParticipant.upsert({
      where: {
        meetingId_userId: {
          meetingId: meeting.id,
          userId,
        },
      },
      create: {
        meetingId: meeting.id,
        userId,
        role,
        status: MeetingParticipantStatus.JOINED,
        joinedAt: now,
        lastSeenAt: now,
      },
      update: {
        status: MeetingParticipantStatus.JOINED,
        joinedAt: existingParticipant?.joinedAt ?? now,
        leftAt: null,
        lastSeenAt: now,
      },
    });

    if (!existingParticipant) {
      await this.prisma.meetingEvent.create({
        data: {
          meetingId: meeting.id,
          actorId: userId,
          type: MeetingEventType.PARTICIPANT_JOINED,
        },
      });
    }

    const token = await this.liveKitService.createParticipantToken({
      roomName: meeting.roomName,
      userId,
      displayName: userName,
      avatarUrl,
      role,
      deviceSettings: dto?.deviceSettings,
    });

    return this.toMeetingRoomResponse(meeting, role, token);
  }

  private toMeetingRoomResponse(
    meeting: {
      id: string;
      roomName: string;
      joinToken: string;
      type: MeetingType;
      status: MeetingStatus;
      autoAdmit: boolean;
      startedAt: Date | null;
      createdAt: Date;
    },
    participantRole: MeetingRole,
    token: string,
  ) {
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
        participantRole,
      },
      livekit: {
        serverUrl: this.liveKitService.getServerUrl(),
        token,
      },
    };
  }
}
