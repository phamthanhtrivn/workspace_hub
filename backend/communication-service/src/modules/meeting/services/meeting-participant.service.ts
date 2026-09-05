import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  MeetingEventType,
  MeetingParticipantStatus,
  MeetingRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import type {
  ListMeetingParticipantViewPreferencesParams,
  ListMeetingParticipantsParams,
  MeetingModeratorParams,
  TargetMeetingParticipantParams,
  UpdateMeetingChatNotificationPreferenceParams,
  UpdateMeetingParticipantViewPreferenceParams,
  UpdateMeetingParticipantRoleParams,
} from '../types/meeting.types';
import { MeetingPolicyService } from './meeting-policy.service';
import { MeetingPresenterService } from './meeting-presenter.service';
import { MeetingRealtimeService } from './meeting-realtime.service';

@Injectable()
export class MeetingParticipantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly meetingPolicyService: MeetingPolicyService,
    private readonly meetingPresenterService: MeetingPresenterService,
    private readonly meetingRealtimeService: MeetingRealtimeService,
  ) {}

  async listMeetingParticipants({
    joinToken,
    userId,
    query,
  }: ListMeetingParticipantsParams) {
    const { meeting } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(50, Math.max(1, query?.limit ?? 10));
    const search = query?.search?.trim();
    const where: Prisma.MeetingParticipantWhereInput = {
      meetingId: meeting.id,
      status: MeetingParticipantStatus.JOINED,
    };

    if (search) {
      where.userId =
        await this.meetingPolicyService.getUserIdSearchFilter(search);
    }

    const [total, participants] = await this.prisma.$transaction([
      this.prisma.meetingParticipant.count({ where }),
      this.prisma.meetingParticipant.findMany({
        where,
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const enrichedParticipants =
      await this.userProfileSnapshotService.attachProfilesToMembers(
        participants,
      );

    return {
      items: enrichedParticipants.map((participant) =>
        this.meetingPresenterService.toMeetingParticipantListItem(participant),
      ),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async listMeetingParticipantViewPreferences({
    joinToken,
    userId,
  }: ListMeetingParticipantViewPreferencesParams) {
    const { meeting } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });

    return this.listParticipantViewPreferenceItems(meeting.id, userId);
  }

  async leaveMeeting({ joinToken, userId }: MeetingModeratorParams) {
    const { meeting, participant } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });
    const now = new Date();
    const updatedParticipant = await this.prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: {
        status: MeetingParticipantStatus.LEFT,
        leftAt: now,
        lastSeenAt: now,
      },
    });

    await this.prisma.meetingEvent.create({
      data: {
        meetingId: meeting.id,
        actorId: userId,
        type: MeetingEventType.PARTICIPANT_LEFT,
      },
    });

    const payload =
      await this.meetingPresenterService.toMeetingParticipantSocketPayload(
        meeting.id,
        updatedParticipant,
      );
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.PARTICIPANT_UPDATED,
      payload,
    );
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.PARTICIPANT_LEFT,
      payload,
    );

    return payload;
  }

  async removeParticipant({
    joinToken,
    userId,
    targetUserId,
  }: TargetMeetingParticipantParams) {
    const { meeting, participant: actorParticipant } =
      await this.meetingPolicyService.assertMeetingModerator({
        joinToken,
        userId,
      });

    if (targetUserId === userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.CANNOT_REMOVE_SELF);
    }

    const targetParticipant =
      await this.meetingPolicyService.getJoinedTargetParticipant({
        meetingId: meeting.id,
        targetUserId,
      });

    if (targetParticipant.role === MeetingRole.HOST) {
      throw new ForbiddenException(
        MEETING_ERROR_MESSAGES.CANNOT_REMOVE_MODERATOR,
      );
    }

    if (
      actorParticipant?.role === MeetingRole.COHOST &&
      targetParticipant.role !== MeetingRole.PARTICIPANT
    ) {
      throw new ForbiddenException(
        MEETING_ERROR_MESSAGES.CANNOT_REMOVE_MODERATOR,
      );
    }

    const now = new Date();
    const updatedParticipant = await this.prisma.meetingParticipant.update({
      where: { id: targetParticipant.id },
      data: {
        status: MeetingParticipantStatus.REMOVED,
        leftAt: now,
        lastSeenAt: now,
      },
    });

    await this.prisma.meetingEvent.create({
      data: {
        meetingId: meeting.id,
        actorId: userId,
        type: MeetingEventType.PARTICIPANT_REMOVED,
        metadata: { targetUserId },
      },
    });

    const payload =
      await this.meetingPresenterService.toMeetingParticipantSocketPayload(
        meeting.id,
        updatedParticipant,
      );
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.PARTICIPANT_UPDATED,
      payload,
    );
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.PARTICIPANT_REMOVED,
      payload,
    );
    await this.meetingRealtimeService.removeLiveKitParticipant(
      meeting.roomName,
      targetUserId,
    );

    return payload;
  }

  async updateParticipantRole({
    joinToken,
    userId,
    targetUserId,
    dto,
  }: UpdateMeetingParticipantRoleParams) {
    const { meeting } = await this.meetingPolicyService.assertMeetingHost({
      joinToken,
      userId,
    });
    const targetParticipant =
      await this.meetingPolicyService.getJoinedTargetParticipant({
        meetingId: meeting.id,
        targetUserId,
      });

    if (targetUserId === meeting.hostId && dto.role !== MeetingRole.HOST) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.CANNOT_DEMOTE_CURRENT_HOST,
      );
    }

    if (dto.role === MeetingRole.HOST) {
      return this.transferHost({
        meeting,
        currentHostUserId: userId,
        targetParticipant,
      });
    }

    const updatedParticipant = await this.prisma.meetingParticipant.update({
      where: { id: targetParticipant.id },
      data: { role: dto.role },
    });

    await this.prisma.meetingEvent.create({
      data: {
        meetingId: meeting.id,
        actorId: userId,
        type: MeetingEventType.PARTICIPANT_ROLE_UPDATED,
        metadata: {
          targetUserId,
          previousRole: targetParticipant.role,
          role: dto.role,
        },
      },
    });

    const payload =
      await this.meetingPresenterService.toMeetingParticipantSocketPayload(
        meeting.id,
        updatedParticipant,
      );
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.PARTICIPANT_UPDATED,
      payload,
    );
    await this.meetingRealtimeService.syncLiveKitParticipantMetadata(
      meeting.roomName,
      targetUserId,
      dto.role,
    );

    return payload;
  }

  async updateChatNotificationPreference({
    joinToken,
    userId,
    dto,
  }: UpdateMeetingChatNotificationPreferenceParams) {
    const { meeting, participant } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });

    const updatedParticipant = await this.prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: {
        chatMuted: dto.chatMuted,
      },
    });
    const payload = {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      userId,
      chatMuted: updatedParticipant.chatMuted,
    };

    this.meetingRealtimeService.emitUserEvent(
      userId,
      MeetingEvent.CHAT_NOTIFICATION_PREFERENCE_UPDATED,
      payload,
    );

    return payload;
  }

  async updateParticipantViewPreference({
    joinToken,
    userId,
    targetUserId,
    dto,
  }: UpdateMeetingParticipantViewPreferenceParams) {
    const { meeting } =
      await this.meetingPolicyService.assertJoinedMeetingParticipant({
        joinToken,
        userId,
      });

    if (targetUserId === userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.CANNOT_TARGET_SELF);
    }

    if (dto.audioMuted === undefined && dto.pinned === undefined) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.PARTICIPANT_VIEW_PREFERENCE_REQUIRED,
      );
    }

    await this.meetingPolicyService.getJoinedTargetParticipant({
      meetingId: meeting.id,
      targetUserId,
    });

    await this.prisma.$transaction(async (tx) => {
      const preferenceKey = {
        meetingId_viewerUserId_targetUserId: {
          meetingId: meeting.id,
          viewerUserId: userId,
          targetUserId,
        },
      };
      const existingPreference =
        await tx.meetingParticipantViewPreference.findUnique({
          where: preferenceKey,
        });
      const audioMuted =
        dto.audioMuted ?? existingPreference?.audioMuted ?? false;
      const pinned = dto.pinned ?? existingPreference?.pinned ?? false;

      if (dto.pinned === true) {
        await tx.meetingParticipantViewPreference.updateMany({
          where: {
            meetingId: meeting.id,
            viewerUserId: userId,
            targetUserId: { not: targetUserId },
            pinned: true,
          },
          data: { pinned: false },
        });
        await tx.meetingParticipantViewPreference.deleteMany({
          where: {
            meetingId: meeting.id,
            viewerUserId: userId,
            targetUserId: { not: targetUserId },
            audioMuted: false,
            pinned: false,
          },
        });
      }

      if (!audioMuted && !pinned) {
        if (existingPreference) {
          await tx.meetingParticipantViewPreference.delete({
            where: preferenceKey,
          });
        }

        return;
      }

      await tx.meetingParticipantViewPreference.upsert({
        where: preferenceKey,
        create: {
          meetingId: meeting.id,
          viewerUserId: userId,
          targetUserId,
          audioMuted,
          pinned,
        },
        update: {
          audioMuted,
          pinned,
        },
      });
    });

    return this.listParticipantViewPreferenceItems(meeting.id, userId);
  }

  private async listParticipantViewPreferenceItems(
    meetingId: string,
    viewerUserId: string,
  ) {
    const preferences =
      await this.prisma.meetingParticipantViewPreference.findMany({
        where: {
          meetingId,
          viewerUserId,
          OR: [{ audioMuted: true }, { pinned: true }],
        },
        orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      });

    return {
      items: preferences.map((preference) =>
        this.meetingPresenterService.toMeetingParticipantViewPreferenceItem(
          preference,
        ),
      ),
    };
  }

  private async transferHost({
    meeting,
    currentHostUserId,
    targetParticipant,
  }: {
    meeting: {
      id: string;
      roomName: string;
      joinToken: string;
      hostId: string;
    };
    currentHostUserId: string;
    targetParticipant: {
      id: string;
      userId: string;
      role: MeetingRole;
    };
  }) {
    const previousHostId = meeting.hostId;
    const [updatedTargetParticipant, updatedPreviousHostParticipant] =
      await this.prisma.$transaction([
        this.prisma.meetingParticipant.update({
          where: { id: targetParticipant.id },
          data: { role: MeetingRole.HOST },
        }),
        this.prisma.meetingParticipant.update({
          where: {
            meetingId_userId: {
              meetingId: meeting.id,
              userId: previousHostId,
            },
          },
          data: { role: MeetingRole.PARTICIPANT },
        }),
        this.prisma.meeting.update({
          where: { id: meeting.id },
          data: { hostId: targetParticipant.userId },
        }),
        this.prisma.meetingEvent.create({
          data: {
            meetingId: meeting.id,
            actorId: currentHostUserId,
            type: MeetingEventType.HOST_TRANSFERRED,
            metadata: {
              previousHostId,
              targetUserId: targetParticipant.userId,
            },
          },
        }),
      ]);

    const payload = {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      previousHostId,
      hostId: targetParticipant.userId,
      targetUserId: targetParticipant.userId,
    };
    const targetPayload =
      await this.meetingPresenterService.toMeetingParticipantSocketPayload(
        meeting.id,
        updatedTargetParticipant,
      );
    const previousHostPayload =
      await this.meetingPresenterService.toMeetingParticipantSocketPayload(
        meeting.id,
        updatedPreviousHostParticipant,
      );

    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.HOST_TRANSFERRED,
      payload,
    );
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.PARTICIPANT_UPDATED,
      targetPayload,
    );
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.PARTICIPANT_UPDATED,
      previousHostPayload,
    );
    await Promise.all([
      this.meetingRealtimeService.syncLiveKitParticipantMetadata(
        meeting.roomName,
        targetParticipant.userId,
        MeetingRole.HOST,
      ),
      this.meetingRealtimeService.syncLiveKitParticipantMetadata(
        meeting.roomName,
        previousHostId,
        MeetingRole.PARTICIPANT,
      ),
    ]);

    return targetPayload;
  }
}
