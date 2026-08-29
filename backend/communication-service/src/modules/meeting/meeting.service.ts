import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Meeting,
  MeetingParticipant,
  MeetingParticipantStatus as PrismaMeetingParticipantStatus,
  MeetingStatus as PrismaMeetingStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInstantMeetingDto } from './dto/create-instant-meeting.dto';
import { MeetingLiveKitService } from './livekit/meeting-livekit.service';
import { MeetingRealtimePublisher } from './realtime/meeting-realtime.publisher';
import { MeetingAuditService } from './services/meeting-audit.service';
import { MeetingAuthorizationService } from './services/meeting-authorization.service';
import { MeetingResponseMapper } from './services/meeting-response.mapper';
import {
  MeetingDefault,
  MeetingErrorMessage,
  MeetingEventTypeValue,
  MeetingParticipantRoleValue,
  MeetingParticipantStatusValue,
  MeetingStatusValue,
  MeetingTypeValue,
} from './types/meeting.enums';
import {
  MeetingResponse,
  MeetingLiveKitTokenResponse,
  MeetingParticipantWithProfile,
  RequestJoinMeetingResult,
} from './types/meeting.types';

@Injectable()
export class MeetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimePublisher: MeetingRealtimePublisher,
    private readonly meetingLiveKitService: MeetingLiveKitService,
    private readonly meetingAuthorizationService: MeetingAuthorizationService,
    private readonly meetingResponseMapper: MeetingResponseMapper,
    private readonly meetingAuditService: MeetingAuditService,
  ) {}

  private buildRoomName() {
    return `${MeetingDefault.ROOM_PREFIX}-${randomUUID()}`;
  }

  private buildJoinToken() {
    return randomUUID();
  }

  private async getMeetingOrThrow(meetingId: string): Promise<Meeting> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      throw new NotFoundException(MeetingErrorMessage.MEETING_NOT_FOUND);
    }
    return meeting;
  }

  private async assertApprovedParticipant(meetingId: string, userId: string) {
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

    if (participant.status === PrismaMeetingParticipantStatus.REMOVED) {
      throw new ForbiddenException(MeetingErrorMessage.PARTICIPANT_REMOVED);
    }

    if (participant.status !== PrismaMeetingParticipantStatus.JOINED) {
      throw new ForbiddenException(
        MeetingErrorMessage.PARTICIPANT_JOIN_REQUIRED,
      );
    }

    return participant;
  }

  async createInstantMeeting(
    userId: string,
    body: CreateInstantMeetingDto,
  ): Promise<MeetingResponse> {
    const allowJoinWithoutApproval = body.allowJoinWithoutApproval ?? false;
    const now = new Date();

    const meeting = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const createdMeeting = await tx.meeting.create({
          data: {
            roomName: this.buildRoomName(),
            joinToken: this.buildJoinToken(),
            type: MeetingTypeValue.INSTANT,
            status: MeetingStatusValue.LIVE,
            createdBy: userId,
            hostId: userId,
            startedAt: now,
            allowJoinWithoutApproval,
            participants: {
              create: {
                userId,
                role: MeetingParticipantRoleValue.HOST,
                status: MeetingParticipantStatusValue.JOINED,
                joinedAt: now,
                lastSeenAt: now,
              },
            },
            events: {
              create: [
                {
                  actorId: userId,
                  type: MeetingEventTypeValue.CREATED,
                  metadata: { allowJoinWithoutApproval },
                },
                {
                  actorId: userId,
                  type: MeetingEventTypeValue.STARTED,
                },
              ],
            },
          },
          include: {
            participants: true,
            _count: {
              select: {
                participants: {
                  where: {
                    status: MeetingParticipantStatusValue.REQUESTED,
                  },
                },
              },
            },
          },
        });

        return createdMeeting;
      },
    );

    return this.meetingResponseMapper.map(meeting, userId);
  }

  async getUserMeetings(userId: string): Promise<MeetingResponse[]> {
    const meetings = await this.prisma.meeting.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { hostId: userId },
          { participants: { some: { userId } } },
        ],
      },
      include: {
        participants: true,
        _count: {
          select: {
            participants: {
              where: {
                status: MeetingParticipantStatusValue.REQUESTED,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      meetings.map((meeting) =>
        this.meetingResponseMapper.map(meeting, userId),
      ),
    );
  }

  async getJoinInfoByToken(
    joinToken: string,
    userId: string,
  ): Promise<MeetingResponse> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { joinToken },
      include: {
        participants: {
          where: {
            OR: [{ status: MeetingParticipantStatusValue.JOINED }, { userId }],
          },
        },
        _count: {
          select: {
            participants: {
              where: {
                status: MeetingParticipantStatusValue.REQUESTED,
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException(MeetingErrorMessage.MEETING_NOT_FOUND);
    }

    return this.meetingResponseMapper.map(meeting, userId);
  }

  async requestJoin(
    meetingId: string,
    userId: string,
  ): Promise<RequestJoinMeetingResult> {
    const meeting = await this.getMeetingOrThrow(meetingId);
    if (meeting.status !== PrismaMeetingStatus.LIVE) {
      throw new BadRequestException(MeetingErrorMessage.MEETING_NOT_LIVE);
    }

    const now = new Date();
    const existingParticipant = await this.prisma.meetingParticipant.findUnique(
      {
        where: {
          meetingId_userId: {
            meetingId,
            userId,
          },
        },
      },
    );
    const wasAlreadyApproved =
      existingParticipant?.status === PrismaMeetingParticipantStatus.JOINED ||
      existingParticipant?.status === PrismaMeetingParticipantStatus.LEFT;
    if (
      existingParticipant?.status === PrismaMeetingParticipantStatus.REMOVED
    ) {
      throw new ForbiddenException(MeetingErrorMessage.PARTICIPANT_REMOVED);
    }
    const nextStatus =
      meeting.allowJoinWithoutApproval || wasAlreadyApproved
        ? MeetingParticipantStatusValue.JOINED
        : MeetingParticipantStatusValue.REQUESTED;

    const participant = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const updatedParticipant = await tx.meetingParticipant.upsert({
          where: {
            meetingId_userId: {
              meetingId,
              userId,
            },
          },
          create: {
            meetingId,
            userId,
            role: MeetingParticipantRoleValue.PARTICIPANT,
            status: nextStatus,
            joinedAt:
              nextStatus === MeetingParticipantStatusValue.JOINED
                ? now
                : undefined,
            lastSeenAt: now,
          },
          update: {
            status: nextStatus,
            joinedAt:
              nextStatus === MeetingParticipantStatusValue.JOINED
                ? now
                : undefined,
            lastSeenAt: now,
            leftAt: null,
          },
        });

        await this.meetingAuditService.joinRequestStateChanged(
          tx,
          meetingId,
          userId,
          nextStatus,
        );

        return updatedParticipant;
      },
    );
    const [enrichedParticipant] =
      await this.meetingResponseMapper.enrichParticipants([participant]);
    const meetingResponse = await this.getJoinInfoByToken(
      meeting.joinToken,
      userId,
    );

    if (nextStatus === MeetingParticipantStatusValue.REQUESTED) {
      this.realtimePublisher.joinRequested(
        meetingId,
        userId,
        enrichedParticipant,
      );
    } else {
      this.realtimePublisher.joinApproved(
        meetingId,
        userId,
        enrichedParticipant,
      );
    }

    return {
      participant: enrichedParticipant,
      meeting: meetingResponse,
    };
  }

  async getMeetingParticipants(
    meetingId: string,
    userId: string,
    search?: string,
  ): Promise<MeetingParticipantWithProfile[]> {
    await this.getMeetingOrThrow(meetingId);
    await this.meetingAuthorizationService.assertApprovedParticipant(
      meetingId,
      userId,
    );

    const participants = await this.prisma.meetingParticipant.findMany({
      where: {
        meetingId,
        status: MeetingParticipantStatusValue.JOINED,
      },
      orderBy: [{ role: 'asc' }, { updatedAt: 'asc' }],
    });

    const normalizedSearch = search?.trim();
    if (!normalizedSearch) {
      return this.meetingResponseMapper.enrichParticipants(participants);
    }

    const snapshots = await this.prisma.userProfileSnapshot.findMany({
      where: {
        userId: {
          in: participants.map((participant) => participant.userId),
        },
        OR: [
          {
            fullName: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: { userId: true },
    });
    const matchedUserIds = new Set(
      snapshots.map((snapshot) => snapshot.userId),
    );

    return this.meetingResponseMapper.enrichParticipants(
      participants.filter((participant) =>
        matchedUserIds.has(participant.userId),
      ),
    );
  }

  async updateParticipantRole(
    meetingId: string,
    targetUserId: string,
    hostId: string,
    role: MeetingParticipantRoleValue,
  ): Promise<MeetingParticipantWithProfile> {
    const meeting = await this.meetingAuthorizationService.assertHost(
      meetingId,
      hostId,
    );
    if (!Object.values(MeetingParticipantRoleValue).includes(role)) {
      throw new BadRequestException(
        MeetingErrorMessage.INVALID_PARTICIPANT_ROLE,
      );
    }

    const targetParticipant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId: targetUserId,
        },
      },
    });
    if (
      !targetParticipant ||
      targetParticipant.status !== PrismaMeetingParticipantStatus.JOINED
    ) {
      throw new NotFoundException(MeetingErrorMessage.PARTICIPANT_NOT_FOUND);
    }
    if (
      role !== MeetingParticipantRoleValue.HOST &&
      targetUserId === meeting.hostId
    ) {
      throw new BadRequestException(MeetingErrorMessage.HOST_REQUIRED);
    }

    const participant =
      role === MeetingParticipantRoleValue.HOST
        ? await this.transferHost(meetingId, hostId, targetUserId)
        : await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const updatedParticipant = await tx.meetingParticipant.update({
              where: {
                meetingId_userId: {
                  meetingId,
                  userId: targetUserId,
                },
              },
              data: { role },
            });
            await this.meetingAuditService.participantRoleUpdated(
              tx,
              meetingId,
              hostId,
              targetUserId,
              role,
            );
            return updatedParticipant;
          });
    const [enrichedParticipant] =
      await this.meetingResponseMapper.enrichParticipants([participant]);

    this.realtimePublisher.participantRoleUpdated(
      meetingId,
      targetUserId,
      enrichedParticipant,
    );

    return enrichedParticipant;
  }

  private async transferHost(
    meetingId: string,
    oldHostId: string,
    newHostId: string,
  ) {
    if (oldHostId === newHostId) {
      return this.prisma.meetingParticipant.update({
        where: {
          meetingId_userId: {
            meetingId,
            userId: newHostId,
          },
        },
        data: { role: MeetingParticipantRoleValue.HOST },
      });
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.meeting.update({
        where: { id: meetingId },
        data: { hostId: newHostId },
      });
      await tx.meetingParticipant.update({
        where: {
          meetingId_userId: {
            meetingId,
            userId: oldHostId,
          },
        },
        data: { role: MeetingParticipantRoleValue.PARTICIPANT },
      });
      const newHostParticipant = await tx.meetingParticipant.update({
        where: {
          meetingId_userId: {
            meetingId,
            userId: newHostId,
          },
        },
        data: { role: MeetingParticipantRoleValue.HOST },
      });

      await this.meetingAuditService.hostTransferred(
        tx,
        meetingId,
        oldHostId,
        newHostId,
      );

      return newHostParticipant;
    });
  }

  async removeParticipant(
    meetingId: string,
    targetUserId: string,
    hostId: string,
  ): Promise<MeetingParticipantWithProfile> {
    const meeting = await this.meetingAuthorizationService.assertModerator(
      meetingId,
      hostId,
    );
    if (targetUserId === hostId) {
      throw new BadRequestException(
        MeetingErrorMessage.REMOVE_SELF_NOT_ALLOWED,
      );
    }
    if (targetUserId === meeting.hostId) {
      throw new BadRequestException(
        MeetingErrorMessage.REMOVE_HOST_NOT_ALLOWED,
      );
    }

    const targetParticipant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId: targetUserId,
        },
      },
    });
    if (!targetParticipant) {
      throw new NotFoundException(MeetingErrorMessage.PARTICIPANT_NOT_FOUND);
    }
    if (this.meetingAuthorizationService.isModeratorRole(targetParticipant.role)) {
      throw new BadRequestException(
        MeetingErrorMessage.REMOVE_MODERATOR_NOT_ALLOWED,
      );
    }

    const now = new Date();
    const removedParticipant = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const participant = await tx.meetingParticipant.update({
          where: {
            meetingId_userId: {
              meetingId,
              userId: targetUserId,
            },
          },
          data: {
            status: MeetingParticipantStatusValue.REMOVED,
            role: MeetingParticipantRoleValue.PARTICIPANT,
            leftAt: now,
            lastSeenAt: now,
          },
        });

        await this.meetingAuditService.participantRemoved(
          tx,
          meetingId,
          hostId,
          targetUserId,
        );

        return participant;
      },
    );
    const [enrichedParticipant] =
      await this.meetingResponseMapper.enrichParticipants([
        removedParticipant,
      ]);

    await this.meetingLiveKitService.removeParticipant(
      meeting.roomName,
      targetUserId,
    );
    this.realtimePublisher.participantRemoved(
      meetingId,
      targetUserId,
      enrichedParticipant,
    );

    return enrichedParticipant;
  }

  async getJoinRequests(
    meetingId: string,
    userId: string,
  ): Promise<MeetingParticipantWithProfile[]> {
    await this.meetingAuthorizationService.assertModerator(meetingId, userId);
    const participants = await this.prisma.meetingParticipant.findMany({
      where: {
        meetingId,
        status: MeetingParticipantStatusValue.REQUESTED,
      },
      orderBy: { updatedAt: 'asc' },
    });
    return this.meetingResponseMapper.enrichParticipants(participants);
  }

  async approveJoinRequest(
    meetingId: string,
    requesterId: string,
    hostId: string,
  ): Promise<MeetingParticipantWithProfile> {
    await this.meetingAuthorizationService.assertModerator(meetingId, hostId);
    if (requesterId === hostId) {
      throw new BadRequestException(
        MeetingErrorMessage.SELF_REVIEW_NOT_ALLOWED,
      );
    }

    const participant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId: requesterId,
        },
      },
    });

    if (
      !participant ||
      participant.status !== PrismaMeetingParticipantStatus.REQUESTED
    ) {
      throw new NotFoundException(MeetingErrorMessage.REQUEST_NOT_FOUND);
    }

    const updatedParticipant = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const nextParticipant = await tx.meetingParticipant.update({
          where: {
            meetingId_userId: {
              meetingId,
              userId: requesterId,
            },
          },
          data: {
            status: MeetingParticipantStatusValue.JOINED,
            joinedAt: new Date(),
            lastSeenAt: new Date(),
            leftAt: null,
          },
        });

        await this.meetingAuditService.joinDecision(
          tx,
          meetingId,
          hostId,
          requesterId,
          MeetingEventTypeValue.JOIN_APPROVED,
        );

        return nextParticipant;
      },
    );

    const [enrichedParticipant] =
      await this.meetingResponseMapper.enrichParticipants([
        updatedParticipant,
      ]);

    this.realtimePublisher.joinApproved(
      meetingId,
      requesterId,
      enrichedParticipant,
    );
    return enrichedParticipant;
  }

  async rejectJoinRequest(
    meetingId: string,
    requesterId: string,
    hostId: string,
  ): Promise<MeetingParticipantWithProfile> {
    await this.meetingAuthorizationService.assertModerator(meetingId, hostId);
    if (requesterId === hostId) {
      throw new BadRequestException(
        MeetingErrorMessage.SELF_REVIEW_NOT_ALLOWED,
      );
    }

    const participant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId: requesterId,
        },
      },
    });

    if (
      !participant ||
      participant.status !== PrismaMeetingParticipantStatus.REQUESTED
    ) {
      throw new NotFoundException(MeetingErrorMessage.REQUEST_NOT_FOUND);
    }

    const updatedParticipant = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const nextParticipant = await tx.meetingParticipant.update({
          where: {
            meetingId_userId: {
              meetingId,
              userId: requesterId,
            },
          },
          data: {
            status: MeetingParticipantStatusValue.REJECTED,
          },
        });

        await this.meetingAuditService.joinDecision(
          tx,
          meetingId,
          hostId,
          requesterId,
          MeetingEventTypeValue.JOIN_REJECTED,
        );

        return nextParticipant;
      },
    );

    const [enrichedParticipant] =
      await this.meetingResponseMapper.enrichParticipants([
        updatedParticipant,
      ]);

    this.realtimePublisher.joinRejected(
      meetingId,
      requesterId,
      enrichedParticipant,
    );
    return enrichedParticipant;
  }

  async updateAccess(
    meetingId: string,
    userId: string,
    allowJoinWithoutApproval: boolean,
  ): Promise<MeetingResponse> {
    await this.meetingAuthorizationService.assertModerator(meetingId, userId);
    const now = new Date();
    const { meeting, autoApprovedParticipants } =
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        let approvedParticipants: MeetingParticipant[] = [];

        if (allowJoinWithoutApproval) {
          const pendingParticipants = await tx.meetingParticipant.findMany({
            where: {
              meetingId,
              status: MeetingParticipantStatusValue.REQUESTED,
            },
          });
          const pendingUserIds = pendingParticipants.map(
            (participant) => participant.userId,
          );

          if (pendingUserIds.length > 0) {
            await tx.meetingParticipant.updateMany({
              where: {
                meetingId,
                userId: { in: pendingUserIds },
                status: MeetingParticipantStatusValue.REQUESTED,
              },
              data: {
                status: MeetingParticipantStatusValue.JOINED,
                joinedAt: now,
                lastSeenAt: now,
                leftAt: null,
              },
            });

            await this.meetingAuditService.autoApprovedJoinRequests(
              tx,
              meetingId,
              userId,
              pendingUserIds,
            );

            approvedParticipants = await tx.meetingParticipant.findMany({
              where: {
                meetingId,
                userId: { in: pendingUserIds },
              },
            });
          }
        }

        await this.meetingAuditService.accessUpdated(
          tx,
          meetingId,
          userId,
          allowJoinWithoutApproval,
        );

        const updatedMeeting = await tx.meeting.update({
          where: { id: meetingId },
          data: { allowJoinWithoutApproval },
          include: {
            participants: true,
            _count: {
              select: {
                participants: {
                  where: {
                    status: MeetingParticipantStatusValue.REQUESTED,
                  },
                },
              },
            },
          },
        });

        return {
          meeting: updatedMeeting,
          autoApprovedParticipants: approvedParticipants,
        };
      });
    const enrichedAutoApprovedParticipants =
      await this.meetingResponseMapper.enrichParticipants(
        autoApprovedParticipants,
      );

    this.realtimePublisher.accessUpdated(
      meetingId,
      allowJoinWithoutApproval,
    );
    enrichedAutoApprovedParticipants.forEach((participant) => {
      this.realtimePublisher.joinApproved(
        meetingId,
        participant.userId,
        participant,
      );
    });
    return this.meetingResponseMapper.map(meeting, userId);
  }

  async leaveMeeting(
    meetingId: string,
    userId: string,
  ): Promise<MeetingParticipantWithProfile> {
    const meeting = await this.getMeetingOrThrow(meetingId);
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

    const now = new Date();
    const updatedParticipant = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const leftParticipant = await tx.meetingParticipant.update({
          where: {
            meetingId_userId: {
              meetingId,
              userId,
            },
          },
          data: {
            status: MeetingParticipantStatusValue.LEFT,
            leftAt: now,
            lastSeenAt: now,
          },
        });

        await this.meetingAuditService.participantLeft(tx, meetingId, userId);

        return leftParticipant;
      },
    );
    const [enrichedParticipant] =
      await this.meetingResponseMapper.enrichParticipants([
        updatedParticipant,
      ]);

    await this.meetingLiveKitService.removeParticipant(meeting.roomName, userId);
    this.realtimePublisher.participantLeft(
      meetingId,
      userId,
      enrichedParticipant,
    );

    return enrichedParticipant;
  }

  async endMeeting(
    meetingId: string,
    hostId: string,
  ): Promise<MeetingResponse> {
    const meeting = await this.meetingAuthorizationService.assertModerator(
      meetingId,
      hostId,
    );
    if (meeting.status !== PrismaMeetingStatus.LIVE) {
      throw new BadRequestException(MeetingErrorMessage.MEETING_NOT_LIVE);
    }

    const now = new Date();
    const endedMeeting = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.meetingParticipant.updateMany({
          where: {
            meetingId,
            status: {
              in: [
                PrismaMeetingParticipantStatus.JOINED,
                PrismaMeetingParticipantStatus.REQUESTED,
              ],
            },
          },
          data: {
            status: MeetingParticipantStatusValue.LEFT,
            leftAt: now,
            lastSeenAt: now,
          },
        });

        await this.meetingAuditService.meetingEnded(tx, meetingId, hostId);

        return tx.meeting.update({
          where: { id: meetingId },
          data: {
            status: MeetingStatusValue.ENDED,
            endedAt: now,
          },
          include: {
            participants: true,
            _count: {
              select: {
                participants: {
                  where: {
                    status: MeetingParticipantStatusValue.REQUESTED,
                  },
                },
              },
            },
          },
        });
      },
    );

    await this.meetingLiveKitService.deleteRoom(meeting.roomName);
    this.realtimePublisher.meetingEnded(meetingId, hostId);

    return this.meetingResponseMapper.map(endedMeeting, hostId);
  }

  async createLiveKitToken(
    meetingId: string,
    userId: string,
  ): Promise<MeetingLiveKitTokenResponse> {
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
    if (meeting.status !== PrismaMeetingStatus.LIVE) {
      throw new BadRequestException(MeetingErrorMessage.MEETING_NOT_LIVE);
    }

    const participant = meeting.participants[0];
    if (participant?.status === PrismaMeetingParticipantStatus.REMOVED) {
      throw new ForbiddenException(MeetingErrorMessage.PARTICIPANT_REMOVED);
    }
    if (
      !participant ||
      participant.status !== PrismaMeetingParticipantStatus.JOINED
    ) {
      throw new ForbiddenException(
        MeetingErrorMessage.PARTICIPANT_JOIN_REQUIRED,
      );
    }

    return this.meetingLiveKitService.createParticipantToken(
      meeting.roomName,
      userId,
    );
  }
}

