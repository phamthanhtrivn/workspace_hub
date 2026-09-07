import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  MeetingEventType,
  MeetingParticipantStatus,
  MeetingRole,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import type {
  StartMeetingScreenShareParams,
  StopMeetingScreenShareParams,
  StopTargetMeetingScreenShareParams,
} from '../types/meeting.types';
import { MeetingPolicyService } from './meeting-policy.service';
import { MeetingRealtimeService } from './meeting-realtime.service';

export type ScreenShareStopReason =
  | 'stopped'
  | 'interrupted'
  | 'disabled'
  | 'participant_left'
  | 'participant_removed'
  | 'meeting_ended';

@Injectable()
export class MeetingScreenShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meetingPolicyService: MeetingPolicyService,
    private readonly meetingRealtimeService: MeetingRealtimeService,
  ) {}

  async startScreenShare({
    joinToken,
    userId,
    dto,
  }: StartMeetingScreenShareParams) {
    const { meeting, participant } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
    const actorRole = this.getEffectiveMeetingRole({
      meetingHostId: meeting.hostId,
      userId,
      role: participant.role,
    });
    const isModerator =
      actorRole === MeetingRole.HOST || actorRole === MeetingRole.COHOST;

    if (meeting.activeScreenShareUserId === userId) {
      return this.toScreenShareStateResponse({
        meeting,
        userId,
      });
    }

    if (!isModerator && !meeting.screenShareEnabled) {
      throw new ForbiddenException(
        MEETING_ERROR_MESSAGES.MEETING_SCREEN_SHARE_DISABLED,
      );
    }

    const previousScreenShareUserId = meeting.activeScreenShareUserId;

    if (previousScreenShareUserId) {
      const activeScreenShareParticipant =
        await this.prisma.meetingParticipant.findUnique({
          where: {
            meetingId_userId: {
              meetingId: meeting.id,
              userId: previousScreenShareUserId,
            },
          },
          select: {
            role: true,
          },
        });
      const activeScreenShareRole = this.getEffectiveMeetingRole({
        meetingHostId: meeting.hostId,
        userId: previousScreenShareUserId,
        role: activeScreenShareParticipant?.role,
      });

      this.assertCanInterruptScreenShare({
        actorRole,
        activeScreenShareRole,
        interrupt: dto?.interrupt === true,
      });
    }

    const now = new Date();
    const updateResult = await this.prisma.meeting.updateMany({
      where: previousScreenShareUserId
        ? {
            id: meeting.id,
            activeScreenShareUserId: previousScreenShareUserId,
          }
        : {
            id: meeting.id,
            activeScreenShareUserId: null,
          },
      data: {
        activeScreenShareUserId: userId,
        screenShareStartedAt: now,
      },
    });

    if (updateResult.count === 0) {
      throw new ConflictException(
        MEETING_ERROR_MESSAGES.MEETING_SCREEN_SHARE_ALREADY_ACTIVE,
      );
    }

    await this.prisma.meetingEvent.createMany({
      data: [
        ...(previousScreenShareUserId
          ? [
              {
                meetingId: meeting.id,
                actorId: userId,
                type: MeetingEventType.SCREEN_SHARE_STOPPED,
                metadata: {
                  targetUserId: previousScreenShareUserId,
                  reason: 'interrupted',
                },
              },
            ]
          : []),
        {
          meetingId: meeting.id,
          actorId: userId,
          type: MeetingEventType.SCREEN_SHARE_STARTED,
          metadata: {
            previousScreenShareUserId,
          },
        },
      ],
    });

    await this.meetingRealtimeService.syncLiveKitParticipantPublishPermissions({
      roomName: meeting.roomName,
      userId,
      canShareScreen: true,
    });

    if (previousScreenShareUserId) {
      await this.syncStoppedParticipantPermissions({
        meetingId: meeting.id,
        roomName: meeting.roomName,
        meetingHostId: meeting.hostId,
        targetUserId: previousScreenShareUserId,
      });
      this.emitScreenShareStopped({
        meetingId: meeting.id,
        joinToken: meeting.joinToken,
        screenShareEnabled: meeting.screenShareEnabled,
        activeScreenShareUserId: null,
        screenShareStartedAt: null,
        userId: previousScreenShareUserId,
        stoppedBy: userId,
        reason: 'interrupted',
      });
    }

    const payload = {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      screenShareEnabled: meeting.screenShareEnabled,
      activeScreenShareUserId: userId,
      screenShareStartedAt: now.toISOString(),
      startedBy: userId,
    };

    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.SCREEN_SHARE_STARTED,
      payload,
    );

    return payload;
  }

  async stopScreenShare({ joinToken, userId }: StopMeetingScreenShareParams) {
    const { meeting } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });

    if (meeting.activeScreenShareUserId !== userId) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.MEETING_SCREEN_SHARE_NOT_ACTIVE,
      );
    }

    const payload = await this.clearActiveScreenShare({
      meetingId: meeting.id,
      roomName: meeting.roomName,
      joinToken: meeting.joinToken,
      meetingHostId: meeting.hostId,
      targetUserId: userId,
      stoppedBy: userId,
      reason: 'stopped',
    });

    if (!payload) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.MEETING_SCREEN_SHARE_NOT_ACTIVE,
      );
    }

    return payload;
  }

  async stopParticipantScreenShare({
    joinToken,
    userId,
    targetUserId,
  }: StopTargetMeetingScreenShareParams) {
    const { meeting } = await this.meetingPolicyService.assertMeetingModerator({
      joinToken,
      userId,
    });

    if (targetUserId !== userId) {
      await this.meetingPolicyService.getJoinedTargetParticipant({
        meetingId: meeting.id,
        targetUserId,
      });
    }

    if (meeting.activeScreenShareUserId !== targetUserId) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.MEETING_SCREEN_SHARE_NOT_ACTIVE,
      );
    }

    const payload = await this.clearActiveScreenShare({
      meetingId: meeting.id,
      roomName: meeting.roomName,
      joinToken: meeting.joinToken,
      meetingHostId: meeting.hostId,
      targetUserId,
      stoppedBy: userId,
      reason: userId === targetUserId ? 'stopped' : 'interrupted',
    });

    if (!payload) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.MEETING_SCREEN_SHARE_NOT_ACTIVE,
      );
    }

    return payload;
  }

  async clearActiveScreenShare({
    meetingId,
    roomName,
    joinToken,
    meetingHostId,
    targetUserId,
    stoppedBy,
    reason,
  }: {
    meetingId: string;
    roomName: string;
    joinToken: string;
    meetingHostId: string;
    targetUserId?: string | null;
    stoppedBy?: string | null;
    reason: ScreenShareStopReason;
  }) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        activeScreenShareUserId: true,
        screenShareEnabled: true,
      },
    });
    const activeScreenShareUserId = meeting?.activeScreenShareUserId;

    if (!activeScreenShareUserId) return null;
    if (targetUserId && activeScreenShareUserId !== targetUserId) return null;

    const updateResult = await this.prisma.meeting.updateMany({
      where: {
        id: meetingId,
        activeScreenShareUserId,
      },
      data: {
        activeScreenShareUserId: null,
        screenShareStartedAt: null,
      },
    });

    if (updateResult.count === 0) return null;

    await this.prisma.meetingEvent.create({
      data: {
        meetingId,
        actorId: stoppedBy ?? activeScreenShareUserId,
        type: MeetingEventType.SCREEN_SHARE_STOPPED,
        metadata: {
          targetUserId: activeScreenShareUserId,
          reason,
        },
      },
    });
    await this.syncStoppedParticipantPermissions({
      meetingId,
      roomName,
      meetingHostId,
      targetUserId: activeScreenShareUserId,
    });

    const payload = {
      meetingId,
      joinToken,
      screenShareEnabled: meeting.screenShareEnabled,
      activeScreenShareUserId: null,
      screenShareStartedAt: null,
      userId: activeScreenShareUserId,
      stoppedBy: stoppedBy ?? activeScreenShareUserId,
      reason,
    };

    this.emitScreenShareStopped(payload);

    return payload;
  }

  private async syncStoppedParticipantPermissions({
    meetingId,
    roomName,
    meetingHostId,
    targetUserId,
  }: {
    meetingId: string;
    roomName: string;
    meetingHostId: string;
    targetUserId: string;
  }) {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId: targetUserId,
        },
      },
      select: {
        role: true,
        status: true,
      },
    });
    const canKeepScreenPermission =
      participant?.status === MeetingParticipantStatus.JOINED &&
      this.isMeetingModerator({
        meetingHostId,
        userId: targetUserId,
        role: participant.role,
      });

    await this.meetingRealtimeService.syncLiveKitParticipantPublishPermissions({
      roomName,
      userId: targetUserId,
      canShareScreen: canKeepScreenPermission,
    });
  }

  private emitScreenShareStopped(payload: {
    meetingId: string;
    joinToken: string;
    screenShareEnabled: boolean;
    activeScreenShareUserId: null;
    screenShareStartedAt: null;
    userId: string;
    stoppedBy: string;
    reason: ScreenShareStopReason;
  }) {
    this.meetingRealtimeService.emitMeetingEvent(
      payload.meetingId,
      MeetingEvent.SCREEN_SHARE_STOPPED,
      payload,
    );
  }

  private isMeetingModerator({
    meetingHostId,
    userId,
    role,
  }: {
    meetingHostId: string;
    userId: string;
    role?: MeetingRole | null;
  }) {
    return (
      meetingHostId === userId ||
      role === MeetingRole.HOST ||
      role === MeetingRole.COHOST
    );
  }

  private getEffectiveMeetingRole({
    meetingHostId,
    userId,
    role,
  }: {
    meetingHostId: string;
    userId: string;
    role?: MeetingRole | null;
  }) {
    if (meetingHostId === userId || role === MeetingRole.HOST) {
      return MeetingRole.HOST;
    }

    if (role === MeetingRole.COHOST) {
      return MeetingRole.COHOST;
    }

    return MeetingRole.PARTICIPANT;
  }

  private assertCanInterruptScreenShare({
    actorRole,
    activeScreenShareRole,
    interrupt,
  }: {
    actorRole: MeetingRole;
    activeScreenShareRole: MeetingRole;
    interrupt: boolean;
  }) {
    if (!interrupt) {
      throw new ConflictException(
        MEETING_ERROR_MESSAGES.MEETING_SCREEN_SHARE_INTERRUPT_REQUIRED,
      );
    }

    if (
      actorRole === MeetingRole.HOST &&
      activeScreenShareRole !== MeetingRole.HOST
    ) {
      return;
    }

    if (
      actorRole === MeetingRole.COHOST &&
      activeScreenShareRole === MeetingRole.PARTICIPANT
    ) {
      return;
    }

    throw new ForbiddenException(
      MEETING_ERROR_MESSAGES.MEETING_SCREEN_SHARE_INTERRUPT_FORBIDDEN,
    );
  }

  private toScreenShareStateResponse({
    meeting,
    userId,
  }: {
    meeting: {
      id: string;
      joinToken: string;
      screenShareEnabled: boolean;
      activeScreenShareUserId: string | null;
      screenShareStartedAt: Date | null;
    };
    userId: string;
  }) {
    return {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      screenShareEnabled: meeting.screenShareEnabled,
      activeScreenShareUserId: meeting.activeScreenShareUserId,
      screenShareStartedAt:
        meeting.screenShareStartedAt?.toISOString() ?? null,
      startedBy: userId,
    };
  }
}
