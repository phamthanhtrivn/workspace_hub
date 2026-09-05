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
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import type {
  CreateInstantMeetingParams,
  GetMeetingAccessParams,
  JoinMeetingParams,
  MeetingModeratorParams,
  UpdateMeetingSettingsParams,
} from '../types/meeting.types';
import {
  canJoinLockedMeeting,
  createJoinToken,
  createRoomName,
} from '../utils/meeting.utils';
import { MeetingPolicyService } from './meeting-policy.service';
import { MeetingPresenterService } from './meeting-presenter.service';
import { MeetingRealtimeService } from './meeting-realtime.service';

@Injectable()
export class MeetingRoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly liveKitService: LiveKitService,
    private readonly meetingPolicyService: MeetingPolicyService,
    private readonly meetingPresenterService: MeetingPresenterService,
    private readonly meetingRealtimeService: MeetingRealtimeService,
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

    return this.meetingPresenterService.toMeetingRoomResponse(
      meeting,
      MeetingRole.HOST,
      token,
      false,
    );
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
    const canJoinWithoutApproval =
      meeting.autoAdmit ||
      canJoinLockedMeeting({
        hostId: meeting.hostId,
        userId,
        role: participantRole,
        participantStatus: existingParticipant?.status,
      });

    return {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      status: meeting.status,
      autoAdmit: meeting.autoAdmit,
      canJoinWithoutApproval,
      participantRole,
      participantStatus: existingParticipant?.status ?? null,
      chatMuted: existingParticipant?.chatMuted ?? false,
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

    const role =
      existingParticipant?.role ??
      (meeting.hostId === userId ? MeetingRole.HOST : MeetingRole.PARTICIPANT);
    const canEnterLockedMeeting = canJoinLockedMeeting({
      hostId: meeting.hostId,
      userId,
      role,
      participantStatus: existingParticipant?.status,
    });

    if (!meeting.autoAdmit && !canEnterLockedMeeting) {
      throw new ForbiddenException(
        MEETING_ERROR_MESSAGES.MEETING_JOIN_REQUIRES_APPROVAL,
      );
    }

    const now = new Date();

    const updatedParticipant = await this.prisma.meetingParticipant.upsert({
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

    if (
      !existingParticipant ||
      existingParticipant.status === MeetingParticipantStatus.APPROVED
    ) {
      await this.prisma.meetingEvent.create({
        data: {
          meetingId: meeting.id,
          actorId: userId,
          type: MeetingEventType.PARTICIPANT_JOINED,
        },
      });
    }

    const participantPayload =
      await this.meetingPresenterService.toMeetingParticipantSocketPayload(
        meeting.id,
        updatedParticipant,
      );
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.PARTICIPANT_JOINED,
      participantPayload,
    );
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.PARTICIPANT_UPDATED,
      participantPayload,
    );

    const token = await this.liveKitService.createParticipantToken({
      roomName: meeting.roomName,
      userId,
      displayName: userName,
      avatarUrl,
      role,
      deviceSettings: dto?.deviceSettings,
    });

    return this.meetingPresenterService.toMeetingRoomResponse(
      meeting,
      role,
      token,
      updatedParticipant.chatMuted,
    );
  }

  async updateMeetingSettings({
    joinToken,
    userId,
    dto,
  }: UpdateMeetingSettingsParams) {
    const { meeting } = await this.meetingPolicyService.assertMeetingModerator({
      joinToken,
      userId,
    });

    const updatedMeeting = await this.prisma.meeting.update({
      where: { id: meeting.id },
      data: { autoAdmit: dto.autoAdmit },
    });

    await this.prisma.meetingEvent.create({
      data: {
        meetingId: meeting.id,
        actorId: userId,
        type: MeetingEventType.AUTO_ADMIT_UPDATED,
        metadata: { autoAdmit: dto.autoAdmit },
      },
    });

    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.STATUS_UPDATED,
      {
        meetingId: meeting.id,
        joinToken: meeting.joinToken,
        autoAdmit: updatedMeeting.autoAdmit,
      },
    );

    return {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      autoAdmit: updatedMeeting.autoAdmit,
    };
  }

  async endMeeting({ joinToken, userId }: MeetingModeratorParams) {
    const { meeting } = await this.meetingPolicyService.assertMeetingHost({
      joinToken,
      userId,
    });
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          status: MeetingStatus.ENDED,
          endedAt: now,
        },
      }),
      this.prisma.meetingParticipant.updateMany({
        where: {
          meetingId: meeting.id,
          status: MeetingParticipantStatus.JOINED,
        },
        data: {
          status: MeetingParticipantStatus.LEFT,
          leftAt: now,
          lastSeenAt: now,
        },
      }),
      this.prisma.meetingEvent.create({
        data: {
          meetingId: meeting.id,
          actorId: userId,
          type: MeetingEventType.ENDED,
          metadata: { endedAt: now.toISOString() },
        },
      }),
    ]);

    const payload = {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      status: MeetingStatus.ENDED,
      autoAdmit: meeting.autoAdmit,
      endedBy: userId,
      endedAt: now.toISOString(),
    };
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.STATUS_UPDATED,
      payload,
    );
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.ENDED,
      payload,
    );
    await this.meetingRealtimeService.deleteLiveKitRoom(meeting.roomName);

    return payload;
  }
}
