import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  MeetingEventType,
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
  MeetingType,
  Prisma,
} from '@prisma/client';
import { LiveKitService } from '../../infrastructure/livekit/livekit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MeetingEvent } from '../socket/meeting/meeting-socket.events';
import { MeetingSocketHandler } from '../socket/meeting/meeting-socket.handler';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { MEETING_ERROR_MESSAGES } from './types/meeting.enums';
import type {
  CreateInstantMeetingParams,
  GetMeetingAccessParams,
  JoinMeetingParams,
  ListJoinRequestsParams,
  ListMeetingParticipantsParams,
  MeetingJoinRequestParams,
  MeetingModeratorParams,
  ResolveJoinRequestParams,
  TargetMeetingParticipantParams,
  UpdateMeetingParticipantRoleParams,
  UpdateMeetingSettingsParams,
} from './types/meeting.types';
import {
  canJoinLockedMeeting,
  createJoinToken,
  createRoomName,
} from './utils/meeting.utils';

@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly liveKitService: LiveKitService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly meetingSocketHandler: MeetingSocketHandler,
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

    const participantPayload = await this.toMeetingParticipantSocketPayload(
      meeting.id,
      updatedParticipant,
    );
    this.emitMeetingEvent(
      meeting.id,
      MeetingEvent.PARTICIPANT_JOINED,
      participantPayload,
    );
    this.emitMeetingEvent(
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

    return this.toMeetingRoomResponse(meeting, role, token);
  }

  async updateMeetingSettings({
    joinToken,
    userId,
    dto,
  }: UpdateMeetingSettingsParams) {
    const { meeting } = await this.assertMeetingModerator({ joinToken, userId });

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

    this.emitMeetingEvent(meeting.id, MeetingEvent.STATUS_UPDATED, {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      autoAdmit: updatedMeeting.autoAdmit,
    });

    return {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      autoAdmit: updatedMeeting.autoAdmit,
    };
  }

  async listMeetingParticipants({
    joinToken,
    userId,
    query,
  }: ListMeetingParticipantsParams) {
    const { meeting } = await this.assertJoinedMeetingParticipant({
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
      where.userId = await this.getUserIdSearchFilter(search);
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
        this.toMeetingParticipantListItem(participant),
      ),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async leaveMeeting({ joinToken, userId }: MeetingModeratorParams) {
    const { meeting, participant } = await this.assertJoinedMeetingParticipant({
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

    const payload = await this.toMeetingParticipantSocketPayload(
      meeting.id,
      updatedParticipant,
    );
    this.emitMeetingEvent(meeting.id, MeetingEvent.PARTICIPANT_UPDATED, payload);
    this.emitMeetingEvent(meeting.id, MeetingEvent.PARTICIPANT_LEFT, payload);

    return payload;
  }

  async endMeeting({ joinToken, userId }: MeetingModeratorParams) {
    const { meeting } = await this.assertMeetingHost({ joinToken, userId });
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
    this.emitMeetingEvent(meeting.id, MeetingEvent.STATUS_UPDATED, payload);
    this.emitMeetingEvent(meeting.id, MeetingEvent.ENDED, payload);
    await this.deleteLiveKitRoom(meeting.roomName);

    return payload;
  }

  async removeParticipant({
    joinToken,
    userId,
    targetUserId,
  }: TargetMeetingParticipantParams) {
    const { meeting, participant: actorParticipant } =
      await this.assertMeetingModerator({ joinToken, userId });

    if (targetUserId === userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.CANNOT_REMOVE_SELF);
    }

    const targetParticipant = await this.getJoinedTargetParticipant({
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

    const payload = await this.toMeetingParticipantSocketPayload(
      meeting.id,
      updatedParticipant,
    );
    this.emitMeetingEvent(meeting.id, MeetingEvent.PARTICIPANT_UPDATED, payload);
    this.emitMeetingEvent(meeting.id, MeetingEvent.PARTICIPANT_REMOVED, payload);
    await this.removeLiveKitParticipant(meeting.roomName, targetUserId);

    return payload;
  }

  async updateParticipantRole({
    joinToken,
    userId,
    targetUserId,
    dto,
  }: UpdateMeetingParticipantRoleParams) {
    const { meeting } = await this.assertMeetingHost({ joinToken, userId });
    const targetParticipant = await this.getJoinedTargetParticipant({
      meetingId: meeting.id,
      targetUserId,
    });

    if (
      targetUserId === meeting.hostId &&
      dto.role !== MeetingRole.HOST
    ) {
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

    const payload = await this.toMeetingParticipantSocketPayload(
      meeting.id,
      updatedParticipant,
    );
    this.emitMeetingEvent(meeting.id, MeetingEvent.PARTICIPANT_UPDATED, payload);
    await this.syncLiveKitParticipantMetadata(
      meeting.roomName,
      targetUserId,
      dto.role,
    );

    return payload;
  }

  async requestJoinApproval({
    joinToken,
    userId,
  }: MeetingJoinRequestParams) {
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
    const isModerator =
      meeting.hostId === userId ||
      existingParticipant?.role === MeetingRole.HOST ||
      existingParticipant?.role === MeetingRole.COHOST;
    if (
      meeting.autoAdmit ||
      isModerator ||
      (existingParticipant &&
        [
          MeetingParticipantStatus.APPROVED,
          MeetingParticipantStatus.JOINED,
          MeetingParticipantStatus.LEFT,
        ].some((status) => status === existingParticipant.status))
    ) {
      return {
        meetingId: meeting.id,
        joinToken: meeting.joinToken,
        participantStatus:
          existingParticipant?.status ?? MeetingParticipantStatus.APPROVED,
      };
    }

    const now = new Date();
    const request = await this.prisma.meetingParticipant.upsert({
      where: {
        meetingId_userId: {
          meetingId: meeting.id,
          userId,
        },
      },
      create: {
        meetingId: meeting.id,
        userId,
        role: MeetingRole.PARTICIPANT,
        status: MeetingParticipantStatus.REQUESTED,
        lastSeenAt: now,
      },
      update: {
        status: MeetingParticipantStatus.REQUESTED,
        leftAt: null,
        lastSeenAt: now,
      },
    });

    await this.prisma.meetingEvent.create({
      data: {
        meetingId: meeting.id,
        actorId: userId,
        type: MeetingEventType.JOIN_REQUESTED,
      },
    });

    const payload = this.toJoinRequestSocketPayload(meeting.id, request);
    this.emitMeetingEvent(meeting.id, MeetingEvent.JOIN_REQUESTED, payload);
    this.emitUserEvent(userId, MeetingEvent.JOIN_REQUEST_UPDATED, payload);

    return {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      participantStatus: request.status,
    };
  }

  async listJoinRequests({ joinToken, userId, query }: ListJoinRequestsParams) {
    const { meeting } = await this.assertMeetingModerator({ joinToken, userId });
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(50, Math.max(1, query?.limit ?? 10));
    const search = query?.search?.trim();
    const where: Prisma.MeetingParticipantWhereInput = {
      meetingId: meeting.id,
      status: MeetingParticipantStatus.REQUESTED,
    };

    if (search) {
      where.userId = await this.getUserIdSearchFilter(search);
    }

    const [total, requests] = await this.prisma.$transaction([
      this.prisma.meetingParticipant.count({ where }),
      this.prisma.meetingParticipant.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const enrichedRequests =
      await this.userProfileSnapshotService.attachProfilesToMembers(requests);

    return {
      items: enrichedRequests.map((request) => ({
        id: request.id,
        meetingId: request.meetingId,
        userId: request.userId,
        role: request.role,
        status: request.status,
        requestedAt: request.updatedAt.toISOString(),
        profile: request.profile,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async approveJoinRequest(params: ResolveJoinRequestParams) {
    return this.resolveJoinRequest(params, MeetingParticipantStatus.APPROVED);
  }

  async declineJoinRequest(params: ResolveJoinRequestParams) {
    return this.resolveJoinRequest(params, MeetingParticipantStatus.REJECTED);
  }

  async approveAllJoinRequests(params: MeetingModeratorParams) {
    return this.resolveAllJoinRequests(params, MeetingParticipantStatus.APPROVED);
  }

  async declineAllJoinRequests(params: MeetingModeratorParams) {
    return this.resolveAllJoinRequests(params, MeetingParticipantStatus.REJECTED);
  }

  private async resolveJoinRequest(
    { joinToken, userId, targetUserId }: ResolveJoinRequestParams,
    status: MeetingParticipantStatus,
  ) {
    const { meeting } = await this.assertMeetingModerator({ joinToken, userId });
    const request = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId: meeting.id,
          userId: targetUserId,
        },
      },
    });

    if (!request || request.status !== MeetingParticipantStatus.REQUESTED) {
      throw new NotFoundException(MEETING_ERROR_MESSAGES.JOIN_REQUEST_NOT_FOUND);
    }

    const updatedRequest = await this.prisma.meetingParticipant.update({
      where: { id: request.id },
      data: { status },
    });
    const eventType =
      status === MeetingParticipantStatus.APPROVED
        ? MeetingEventType.JOIN_REQUEST_APPROVED
        : MeetingEventType.JOIN_REQUEST_REJECTED;

    await this.prisma.meetingEvent.create({
      data: {
        meetingId: meeting.id,
        actorId: userId,
        type: eventType,
        metadata: { targetUserId },
      },
    });

    const payload = this.toJoinRequestSocketPayload(meeting.id, updatedRequest);
    this.emitMeetingEvent(meeting.id, MeetingEvent.JOIN_REQUEST_UPDATED, payload);
    this.emitUserEvent(targetUserId, MeetingEvent.JOIN_REQUEST_UPDATED, payload);

    return payload;
  }

  private async resolveAllJoinRequests(
    { joinToken, userId }: MeetingModeratorParams,
    status: MeetingParticipantStatus,
  ) {
    const { meeting } = await this.assertMeetingModerator({ joinToken, userId });
    const requests = await this.prisma.meetingParticipant.findMany({
      where: {
        meetingId: meeting.id,
        status: MeetingParticipantStatus.REQUESTED,
      },
    });

    if (requests.length === 0) {
      return { count: 0 };
    }

    await this.prisma.$transaction([
      this.prisma.meetingParticipant.updateMany({
        where: {
          meetingId: meeting.id,
          status: MeetingParticipantStatus.REQUESTED,
        },
        data: { status },
      }),
      this.prisma.meetingEvent.createMany({
        data: requests.map((request) => ({
          meetingId: meeting.id,
          actorId: userId,
          type:
            status === MeetingParticipantStatus.APPROVED
              ? MeetingEventType.JOIN_REQUEST_APPROVED
              : MeetingEventType.JOIN_REQUEST_REJECTED,
          metadata: { targetUserId: request.userId },
        })),
      }),
    ]);

    for (const request of requests) {
      const payload = this.toJoinRequestSocketPayload(meeting.id, {
        ...request,
        status,
      });
      this.emitUserEvent(request.userId, MeetingEvent.JOIN_REQUEST_UPDATED, payload);
    }

    this.emitMeetingEvent(meeting.id, MeetingEvent.JOIN_REQUEST_UPDATED, {
      meetingId: meeting.id,
      status,
      count: requests.length,
    });

    return { count: requests.length };
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
    const targetPayload = await this.toMeetingParticipantSocketPayload(
      meeting.id,
      updatedTargetParticipant,
    );
    const previousHostPayload = await this.toMeetingParticipantSocketPayload(
      meeting.id,
      updatedPreviousHostParticipant,
    );

    this.emitMeetingEvent(meeting.id, MeetingEvent.HOST_TRANSFERRED, payload);
    this.emitMeetingEvent(
      meeting.id,
      MeetingEvent.PARTICIPANT_UPDATED,
      targetPayload,
    );
    this.emitMeetingEvent(
      meeting.id,
      MeetingEvent.PARTICIPANT_UPDATED,
      previousHostPayload,
    );
    await Promise.all([
      this.syncLiveKitParticipantMetadata(
        meeting.roomName,
        targetParticipant.userId,
        MeetingRole.HOST,
      ),
      this.syncLiveKitParticipantMetadata(
        meeting.roomName,
        previousHostId,
        MeetingRole.PARTICIPANT,
      ),
    ]);

    return targetPayload;
  }

  private async assertMeetingModerator({
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

  private async assertMeetingHost({ joinToken, userId }: MeetingModeratorParams) {
    const { meeting, participant } = await this.assertJoinedMeetingParticipant({
      joinToken,
      userId,
    });
    const isHost =
      meeting.hostId === userId || participant.role === MeetingRole.HOST;

    if (!isHost) {
      throw new ForbiddenException(MEETING_ERROR_MESSAGES.MEETING_HOST_REQUIRED);
    }

    return { meeting, participant };
  }

  private async assertJoinedMeetingParticipant({
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

  private async getJoinedTargetParticipant({
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

  private async getUserIdSearchFilter(search: string) {
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

  private async toMeetingParticipantSocketPayload(
    meetingId: string,
    participant: {
      id: string;
      meetingId: string;
      userId: string;
      role: MeetingRole;
      status: MeetingParticipantStatus;
      joinedAt: Date | null;
      leftAt?: Date | null;
      updatedAt: Date;
    },
  ) {
    const [enrichedParticipant] =
      await this.userProfileSnapshotService.attachProfilesToMembers([
        participant,
      ]);

    return {
      ...this.toMeetingParticipantListItem(enrichedParticipant),
      meetingId,
    };
  }

  private toMeetingParticipantListItem(participant: {
    id: string;
    meetingId: string;
    userId: string;
    role: MeetingRole;
    status: MeetingParticipantStatus;
    joinedAt: Date | null;
    leftAt?: Date | null;
    updatedAt: Date;
    profile?: unknown;
  }) {
    return {
      id: participant.id,
      meetingId: participant.meetingId,
      userId: participant.userId,
      role: participant.role,
      status: participant.status,
      joinedAt: participant.joinedAt?.toISOString() ?? null,
      leftAt: participant.leftAt?.toISOString() ?? null,
      updatedAt: participant.updatedAt.toISOString(),
      profile: participant.profile ?? null,
    };
  }

  private toJoinRequestSocketPayload(
    meetingId: string,
    request: {
      id: string;
      userId: string;
      status: MeetingParticipantStatus;
      updatedAt: Date;
    },
  ) {
    return {
      id: request.id,
      meetingId,
      userId: request.userId,
      status: request.status,
      requestedAt: request.updatedAt.toISOString(),
    };
  }

  private emitMeetingEvent<TPayload>(
    meetingId: string,
    event: MeetingEvent,
    payload: TPayload,
  ) {
    this.meetingSocketHandler.emitToMeeting(meetingId, event, payload);
  }

  private emitUserEvent<TPayload>(
    userId: string,
    event: MeetingEvent,
    payload: TPayload,
  ) {
    this.meetingSocketHandler.emitToUser(userId, event, payload);
  }

  private async deleteLiveKitRoom(roomName: string) {
    if (!this.liveKitService.isConfigured()) return;

    try {
      await this.liveKitService.deleteRoom(roomName);
    } catch (error) {
      this.logger.warn(
        `Failed to delete LiveKit room ${roomName}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async removeLiveKitParticipant(roomName: string, userId: string) {
    if (!this.liveKitService.isConfigured()) return;

    try {
      await this.liveKitService.removeParticipant(roomName, userId);
    } catch (error) {
      this.logger.warn(
        `Failed to remove LiveKit participant ${userId} from ${roomName}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async syncLiveKitParticipantMetadata(
    roomName: string,
    userId: string,
    role: MeetingRole,
  ) {
    if (!this.liveKitService.isConfigured()) return;

    try {
      const profileByUserId =
        await this.userProfileSnapshotService.getProfilesByUserIds([userId]);
      const profile = profileByUserId.get(userId);

      await this.liveKitService.updateParticipantMetadata({
        roomName,
        userId,
        role,
        displayName: profile?.fullName ?? profile?.email,
        avatarUrl: profile?.avatarUrl,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to update LiveKit participant metadata for ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
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
