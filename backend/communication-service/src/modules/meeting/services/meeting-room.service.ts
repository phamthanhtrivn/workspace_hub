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
  Prisma,
  MeetingStatus,
  MeetingType,
} from '@prisma/client';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import type {
  CreateInstantMeetingParams,
  EndMeetingFromLiveKitRoomFinishedParams,
  GetMeetingAccessParams,
  JoinMeetingParams,
  MeetingModeratorParams,
  StartScheduledMeetingParams,
  UpdateMeetingSettingsParams,
} from '../types/meeting.types';
import {
  MeetingEndReason,
  MeetingScreenShareStopReason,
} from '../types/meeting.constants';
import {
  canJoinLockedMeeting,
  createJoinToken,
  createRoomName,
} from '../utils/meeting.utils';
import {
  hashMeetingPassword,
  isMeetingPasswordValid,
} from '../utils/meeting-password.util';
import { MeetingPolicyService } from './meeting-policy.service';
import { MeetingPresenterService } from './meeting-presenter.service';
import { MeetingRealtimeService } from './meeting-realtime.service';
import { MeetingScreenShareService } from './meeting-screen-share.service';

type MeetingWithParticipants = Prisma.MeetingGetPayload<{
  include: { participants: true };
}>;

function isTerminalMeetingAccessStatus(status: MeetingStatus): boolean {
  return status === MeetingStatus.ENDED || status === MeetingStatus.CANCELLED;
}

@Injectable()
export class MeetingRoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly liveKitService: LiveKitService,
    private readonly meetingPolicyService: MeetingPolicyService,
    private readonly meetingPresenterService: MeetingPresenterService,
    private readonly meetingRealtimeService: MeetingRealtimeService,
    private readonly meetingScreenShareService: MeetingScreenShareService,
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
    const chatEnabled = instantMeetingDto.chatEnabled ?? true;
    const screenShareEnabled = true;
    const passwordHash = hashMeetingPassword(instantMeetingDto.password);
    const roomName = createRoomName();
    const joinToken = createJoinToken();

    await this.liveKitService.createRoom(roomName, {
      meetingType: MeetingType.INSTANT,
      createdBy: userId,
      autoAdmit,
      chatEnabled,
      screenShareEnabled,
    });

    const meeting = await this.prisma.$transaction(async (tx) => {
      const createdMeeting = await tx.meeting.create({
        data: {
          roomName,
          joinToken,
          title: 'Instant meeting',
          type: MeetingType.INSTANT,
          status: MeetingStatus.LIVE,
          createdBy: userId,
          hostId: userId,
          autoAdmit,
          chatEnabled,
          screenShareEnabled,
          passwordHash,
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
      canShareScreen: true,
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

    return this.meetingPresenterService.toMeetingAccessResponse(
      meeting,
      userId,
    );
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

    if (isTerminalMeetingAccessStatus(meeting.status)) {
      return this.meetingPresenterService.toMeetingAccessResponse(
        meeting,
        userId,
      );
    }

    if (meeting.status !== MeetingStatus.LIVE) {
      throw new BadRequestException(
        this.getMeetingStatusErrorMessage(meeting.status),
      );
    }

    if (!this.liveKitService.isConfigured()) {
      throw new ServiceUnavailableException(
        MEETING_ERROR_MESSAGES.LIVEKIT_NOT_CONFIGURED,
      );
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

    if (
      !canEnterLockedMeeting &&
      !isMeetingPasswordValid(meeting.passwordHash, dto?.password)
    ) {
      throw new ForbiddenException(MEETING_ERROR_MESSAGES.INCORRECT_PASSWORD);
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
      canShareScreen:
        role === MeetingRole.HOST ||
        role === MeetingRole.COHOST ||
        meeting.activeScreenShareUserId === userId,
    });

    return this.meetingPresenterService.toMeetingRoomResponse(
      meeting,
      role,
      token,
      updatedParticipant.chatMuted,
    );
  }

  async startScheduledMeeting({
    joinToken,
    userId,
    userName,
    avatarUrl,
    dto,
  }: StartScheduledMeetingParams) {
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

    const participant = meeting.participants[0];
    const role =
      participant?.role ??
      (meeting.hostId === userId ? MeetingRole.HOST : MeetingRole.PARTICIPANT);

    if (role !== MeetingRole.HOST && role !== MeetingRole.COHOST) {
      throw new ForbiddenException(
        MEETING_ERROR_MESSAGES.MEETING_MODERATOR_REQUIRED,
      );
    }

    if (meeting.status === MeetingStatus.LIVE) {
      const token = await this.liveKitService.createParticipantToken({
        roomName: meeting.roomName,
        userId,
        displayName: userName,
        avatarUrl,
        role,
        deviceSettings: dto?.deviceSettings,
        canShareScreen: true,
      });
      return this.meetingPresenterService.toMeetingRoomResponse(
        meeting,
        role,
        token,
        participant?.chatMuted ?? false,
      );
    }

    if (meeting.status !== MeetingStatus.SCHEDULED) {
      throw new BadRequestException(
        this.getMeetingStatusErrorMessage(meeting.status),
      );
    }

    await this.createLiveKitRoomIfNeeded(meeting);

    const now = new Date();
    const startedMeeting = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.meeting.updateMany({
        where: { id: meeting.id, status: MeetingStatus.SCHEDULED },
        data: { status: MeetingStatus.LIVE, startedAt: now },
      });

      if (updateResult.count > 0) {
        await tx.meetingParticipant.update({
          where: {
            meetingId_userId: {
              meetingId: meeting.id,
              userId,
            },
          },
          data: {
            status: MeetingParticipantStatus.JOINED,
            joinedAt: now,
            lastSeenAt: now,
          },
        });

        await tx.meetingEvent.create({
          data: {
            meetingId: meeting.id,
            actorId: userId,
            type: MeetingEventType.STARTED,
            metadata: { startedAt: now.toISOString() },
          },
        });
      }

      return tx.meeting.findUniqueOrThrow({
        where: { id: meeting.id },
        include: {
          participants: {
            where: { userId },
            take: 1,
          },
        },
      });
    });

    if (startedMeeting.status !== MeetingStatus.LIVE) {
      throw new BadRequestException(
        this.getMeetingStatusErrorMessage(startedMeeting.status),
      );
    }

    const startedParticipant = startedMeeting.participants[0];
    const payload = {
      meetingId: startedMeeting.id,
      joinToken: startedMeeting.joinToken,
      status: MeetingStatus.LIVE,
      autoAdmit: startedMeeting.autoAdmit,
      chatEnabled: startedMeeting.chatEnabled,
      screenShareEnabled: startedMeeting.screenShareEnabled,
      activeScreenShareUserId: startedMeeting.activeScreenShareUserId,
      screenShareStartedAt:
        startedMeeting.screenShareStartedAt?.toISOString() ?? null,
      startedBy: userId,
      startedAt: (startedMeeting.startedAt ?? now).toISOString(),
    };

    this.meetingRealtimeService.emitMeetingEvent(
      startedMeeting.id,
      MeetingEvent.STATUS_UPDATED,
      payload,
    );
    this.meetingRealtimeService.emitMeetingEvent(
      startedMeeting.id,
      MeetingEvent.STARTED,
      payload,
    );

    const token = await this.liveKitService.createParticipantToken({
      roomName: startedMeeting.roomName,
      userId,
      displayName: userName,
      avatarUrl,
      role,
      deviceSettings: dto?.deviceSettings,
      canShareScreen: true,
    });

    return this.meetingPresenterService.toMeetingRoomResponse(
      startedMeeting,
      role,
      token,
      startedParticipant?.chatMuted ?? false,
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

    if (
      dto.autoAdmit === undefined &&
      dto.chatEnabled === undefined &&
      dto.screenShareEnabled === undefined
    ) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.MEETING_SETTINGS_REQUIRED,
      );
    }

    const updateData: {
      autoAdmit?: boolean;
      chatEnabled?: boolean;
      screenShareEnabled?: boolean;
    } = {};
    const settingEvents: {
      meetingId: string;
      actorId: string;
      type: MeetingEventType;
      metadata: Record<string, boolean>;
    }[] = [];

    if (dto.autoAdmit !== undefined) {
      updateData.autoAdmit = dto.autoAdmit;
      settingEvents.push({
        meetingId: meeting.id,
        actorId: userId,
        type: MeetingEventType.AUTO_ADMIT_UPDATED,
        metadata: { autoAdmit: dto.autoAdmit },
      });
    }

    if (
      dto.chatEnabled !== undefined &&
      dto.chatEnabled !== meeting.chatEnabled
    ) {
      updateData.chatEnabled = dto.chatEnabled;
      settingEvents.push({
        meetingId: meeting.id,
        actorId: userId,
        type: MeetingEventType.CHAT_SETTING_UPDATED,
        metadata: { chatEnabled: dto.chatEnabled },
      });
    } else if (dto.chatEnabled !== undefined) {
      updateData.chatEnabled = dto.chatEnabled;
    }

    const shouldStopScreenShare =
      dto.screenShareEnabled === false &&
      dto.screenShareEnabled !== meeting.screenShareEnabled &&
      Boolean(meeting.activeScreenShareUserId);

    if (dto.screenShareEnabled !== undefined) {
      updateData.screenShareEnabled = dto.screenShareEnabled;
    }

    const updatedMeeting = await this.prisma.$transaction(async (tx) => {
      const nextMeeting = await tx.meeting.update({
        where: { id: meeting.id },
        data: updateData,
      });

      if (settingEvents.length > 0) {
        await tx.meetingEvent.createMany({
          data: settingEvents,
        });
      }

      return nextMeeting;
    });

    const payload = {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      autoAdmit: updatedMeeting.autoAdmit,
      chatEnabled: updatedMeeting.chatEnabled,
      screenShareEnabled: updatedMeeting.screenShareEnabled,
      activeScreenShareUserId: shouldStopScreenShare
        ? null
        : updatedMeeting.activeScreenShareUserId,
      screenShareStartedAt: shouldStopScreenShare
        ? null
        : (updatedMeeting.screenShareStartedAt?.toISOString() ?? null),
    };

    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.STATUS_UPDATED,
      payload,
    );

    if (shouldStopScreenShare && meeting.activeScreenShareUserId) {
      await this.meetingScreenShareService.clearActiveScreenShare({
        meetingId: meeting.id,
        roomName: meeting.roomName,
        joinToken: meeting.joinToken,
        meetingHostId: meeting.hostId,
        targetUserId: meeting.activeScreenShareUserId,
        stoppedBy: userId,
        reason: MeetingScreenShareStopReason.DISABLED,
      });
    }

    return {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      autoAdmit: updatedMeeting.autoAdmit,
      chatEnabled: updatedMeeting.chatEnabled,
      screenShareEnabled: updatedMeeting.screenShareEnabled,
      activeScreenShareUserId: shouldStopScreenShare
        ? null
        : updatedMeeting.activeScreenShareUserId,
      screenShareStartedAt: shouldStopScreenShare
        ? null
        : (updatedMeeting.screenShareStartedAt?.toISOString() ?? null),
    };
  }

  async endMeeting({ joinToken, userId }: MeetingModeratorParams) {
    const { meeting } = await this.meetingPolicyService.assertMeetingHost({
      joinToken,
      userId,
    });

    return this.endLiveMeeting({
      meeting,
      endedAt: new Date(),
      endedBy: userId,
      reason: MeetingEndReason.HOST_ENDED,
      deleteLiveKitRoom: true,
    });
  }

  async endMeetingFromLiveKitRoomFinished({
    roomName,
    endedAt = new Date(),
    webhookEventId,
  }: EndMeetingFromLiveKitRoomFinishedParams) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { roomName },
      include: { participants: true },
    });

    if (!meeting) {
      return {
        status: 'ignored_unknown_room' as const,
      };
    }

    if (meeting.status !== MeetingStatus.LIVE) {
      return {
        status: 'already_ended' as const,
        meetingId: meeting.id,
      };
    }

    const payload = await this.endLiveMeeting({
      meeting,
      endedAt,
      endedBy: null,
      reason: MeetingEndReason.LIVEKIT_ROOM_FINISHED,
      webhookEventId,
      deleteLiveKitRoom: false,
    });

    return {
      status: 'ended' as const,
      meetingId: meeting.id,
      payload,
    };
  }

  private async endLiveMeeting({
    meeting,
    endedAt,
    endedBy,
    reason,
    webhookEventId,
    deleteLiveKitRoom,
  }: {
    meeting: MeetingWithParticipants;
    endedAt: Date;
    endedBy: string | null;
    reason: MeetingEndReason;
    webhookEventId?: string;
    deleteLiveKitRoom: boolean;
  }) {
    if (meeting.activeScreenShareUserId) {
      await this.meetingScreenShareService.clearActiveScreenShare({
        meetingId: meeting.id,
        roomName: meeting.roomName,
        joinToken: meeting.joinToken,
        meetingHostId: meeting.hostId,
        targetUserId: meeting.activeScreenShareUserId,
        stoppedBy: endedBy,
        reason: MeetingScreenShareStopReason.MEETING_ENDED,
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.meeting.updateMany({
        where: {
          id: meeting.id,
          status: MeetingStatus.LIVE,
        },
        data: {
          status: MeetingStatus.ENDED,
          endedAt,
          activeScreenShareUserId: null,
          screenShareStartedAt: null,
        },
      });

      if (updateResult.count === 0) {
        const currentMeeting = await tx.meeting.findUniqueOrThrow({
          where: { id: meeting.id },
          include: { participants: true },
        });

        return {
          didEnd: false,
          meeting: currentMeeting,
        };
      }

      await tx.meetingParticipant.updateMany({
        where: {
          meetingId: meeting.id,
          status: MeetingParticipantStatus.JOINED,
        },
        data: {
          status: MeetingParticipantStatus.LEFT,
          leftAt: endedAt,
          lastSeenAt: endedAt,
        },
      });

      const metadata: Record<string, string> = {
        endedAt: endedAt.toISOString(),
        reason,
      };

      if (webhookEventId) {
        metadata.webhookEventId = webhookEventId;
      }

      await tx.meetingEvent.create({
        data: {
          meetingId: meeting.id,
          actorId: endedBy,
          type: MeetingEventType.ENDED,
          metadata,
        },
      });

      const endedMeeting = await tx.meeting.findUniqueOrThrow({
        where: { id: meeting.id },
        include: { participants: true },
      });

      return {
        didEnd: true,
        meeting: endedMeeting,
      };
    });

    const payload = {
      meetingId: result.meeting.id,
      joinToken: result.meeting.joinToken,
      status: MeetingStatus.ENDED,
      autoAdmit: result.meeting.autoAdmit,
      chatEnabled: result.meeting.chatEnabled,
      screenShareEnabled: result.meeting.screenShareEnabled,
      activeScreenShareUserId: null,
      screenShareStartedAt: null,
      endedBy: endedBy ?? 'system',
      endedAt: (result.meeting.endedAt ?? endedAt).toISOString(),
    };

    if (result.didEnd) {
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
    }

    if (deleteLiveKitRoom && result.didEnd) {
      await this.meetingRealtimeService.deleteLiveKitRoom(meeting.roomName);
    }

    return payload;
  }

  private async createLiveKitRoomIfNeeded(
    meeting: Pick<
      MeetingWithParticipants,
      | 'roomName'
      | 'type'
      | 'createdBy'
      | 'autoAdmit'
      | 'chatEnabled'
      | 'screenShareEnabled'
    >,
  ) {
    try {
      await this.liveKitService.createRoom(meeting.roomName, {
        meetingType: meeting.type,
        createdBy: meeting.createdBy,
        autoAdmit: meeting.autoAdmit,
        chatEnabled: meeting.chatEnabled,
        screenShareEnabled: meeting.screenShareEnabled,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('already') || message.includes('exist')) return;
      throw error;
    }
  }

  private getMeetingStatusErrorMessage(status: MeetingStatus): string {
    if (status === MeetingStatus.SCHEDULED) {
      return MEETING_ERROR_MESSAGES.MEETING_NOT_STARTED;
    }
    if (status === MeetingStatus.CANCELLED) {
      return MEETING_ERROR_MESSAGES.MEETING_CANCELLED;
    }
    if (status === MeetingStatus.ENDED) {
      return MEETING_ERROR_MESSAGES.MEETING_ALREADY_ENDED;
    }
    return MEETING_ERROR_MESSAGES.MEETING_NOT_LIVE;
  }
}
