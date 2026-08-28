import {
  BadRequestException,
  ForbiddenException,
  Inject,
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
import { AccessToken } from 'livekit-server-sdk';
import { LIVEKIT_CONFIG } from '../../infrastructure/livekit/livekit.constants';
import type { LiveKitConfig } from '../../infrastructure/livekit/livekit.types';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { CreateInstantMeetingDto } from './dto/create-instant-meeting.dto';
import {
  MeetingClientRoute,
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
  MeetingWithParticipantsAndPendingCountRaw,
  MeetingLiveKitTokenResponse,
  MeetingParticipantWithProfile,
  RequestJoinMeetingResult,
} from './types/meeting.types';

@Injectable()
export class MeetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    @Inject(LIVEKIT_CONFIG)
    private readonly liveKitConfig: LiveKitConfig,
  ) {}

  private buildJoinUrl(joinToken: string) {
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
    const path = `/${MeetingClientRoute.MEETINGS}/${joinToken}`;
    return frontendUrl ? `${frontendUrl}${path}` : path;
  }

  private buildRoomName() {
    return `${MeetingDefault.ROOM_PREFIX}-${randomUUID()}`;
  }

  private buildJoinToken() {
    return randomUUID();
  }

  private async assertHost(
    meetingId: string,
    userId: string,
  ): Promise<Meeting> {
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

  private async getMeetingOrThrow(meetingId: string): Promise<Meeting> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      throw new NotFoundException(MeetingErrorMessage.MEETING_NOT_FOUND);
    }
    return meeting;
  }

  private async enrichParticipants(
    participants: MeetingParticipant[],
  ): Promise<MeetingParticipantWithProfile[]> {
    return this.userProfileSnapshotService.attachProfilesToMembers(
      participants,
    );
  }

  private async mapMeetingResponse(
    meeting: MeetingWithParticipantsAndPendingCountRaw,
    userId: string,
  ): Promise<MeetingResponse> {
    const participants = await this.enrichParticipants(
      meeting.participants ?? [],
    );
    const participant = participants.find((item) => item.userId === userId);
    const pendingJoinRequestCount =
      meeting._count?.participants ??
      participants.filter(
        (item) => item.status === PrismaMeetingParticipantStatus.REQUESTED,
      ).length;
    const meetingData = { ...meeting };
    delete (meetingData as Partial<typeof meeting>)._count;

    return {
      ...meetingData,
      participants,
      joinUrl: this.buildJoinUrl(meeting.joinToken),
      currentParticipant: participant ?? null,
      pendingJoinRequestCount,
    };
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

    return this.mapMeetingResponse(meeting, userId);
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
      meetings.map((meeting) => this.mapMeetingResponse(meeting, userId)),
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

    return this.mapMeetingResponse(meeting, userId);
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
      existingParticipant?.status === PrismaMeetingParticipantStatus.JOINED;
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

        await tx.meetingEvent.create({
          data: {
            meetingId,
            actorId: userId,
            type: MeetingEventTypeValue.PARTICIPANT_JOINED,
            metadata: { status: nextStatus },
          },
        });

        return updatedParticipant;
      },
    );
    const [enrichedParticipant] = await this.enrichParticipants([participant]);
    const meetingResponse = await this.getJoinInfoByToken(
      meeting.joinToken,
      userId,
    );

    if (nextStatus === MeetingParticipantStatusValue.REQUESTED) {
      this.chatGateway.emitMeetingJoinRequested(
        meetingId,
        userId,
        enrichedParticipant,
      );
    } else {
      this.chatGateway.emitMeetingJoinApproved(
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

  async getJoinRequests(
    meetingId: string,
    userId: string,
  ): Promise<MeetingParticipantWithProfile[]> {
    await this.assertHost(meetingId, userId);
    const participants = await this.prisma.meetingParticipant.findMany({
      where: {
        meetingId,
        status: MeetingParticipantStatusValue.REQUESTED,
      },
      orderBy: { updatedAt: 'asc' },
    });
    return this.enrichParticipants(participants);
  }

  async approveJoinRequest(
    meetingId: string,
    requesterId: string,
    hostId: string,
  ): Promise<MeetingParticipantWithProfile> {
    await this.assertHost(meetingId, hostId);
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

    const updatedParticipant = await this.prisma.meetingParticipant.update({
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

    const [enrichedParticipant] = await this.enrichParticipants([
      updatedParticipant,
    ]);

    this.chatGateway.emitMeetingJoinApproved(
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
    await this.assertHost(meetingId, hostId);
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

    const updatedParticipant = await this.prisma.meetingParticipant.update({
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

    const [enrichedParticipant] = await this.enrichParticipants([
      updatedParticipant,
    ]);

    this.chatGateway.emitMeetingJoinRejected(
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
    await this.assertHost(meetingId, userId);
    const now = new Date();
    const { meeting, autoApprovedParticipants } = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
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

            await tx.meetingEvent.createMany({
              data: pendingUserIds.map((pendingUserId) => ({
                meetingId,
                actorId: pendingUserId,
                type: MeetingEventTypeValue.PARTICIPANT_JOINED,
                metadata: { status: MeetingParticipantStatusValue.JOINED },
              })),
            });

            approvedParticipants = await tx.meetingParticipant.findMany({
              where: {
                meetingId,
                userId: { in: pendingUserIds },
              },
            });
          }
        }

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
      },
    );
    const enrichedAutoApprovedParticipants = await this.enrichParticipants(
      autoApprovedParticipants,
    );

    this.chatGateway.emitMeetingAccessUpdated(
      meetingId,
      allowJoinWithoutApproval,
    );
    enrichedAutoApprovedParticipants.forEach((participant) => {
      this.chatGateway.emitMeetingJoinApproved(
        meetingId,
        participant.userId,
        participant,
      );
    });
    return this.mapMeetingResponse(meeting, userId);
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
    if (
      !participant ||
      participant.status !== PrismaMeetingParticipantStatus.JOINED
    ) {
      throw new ForbiddenException(
        MeetingErrorMessage.PARTICIPANT_JOIN_REQUIRED,
      );
    }

    const profile = (
      await this.userProfileSnapshotService.getProfilesByUserIds([userId])
    ).get(userId);
    const displayName = profile?.fullName || profile?.email || userId;
    const accessToken = new AccessToken(
      this.liveKitConfig.apiKey,
      this.liveKitConfig.apiSecret,
      {
        identity: userId,
        name: displayName,
        metadata: JSON.stringify({
          email: profile?.email ?? null,
          avatarUrl: profile?.avatarUrl ?? null,
        }),
        ttl: MeetingDefault.LIVEKIT_TOKEN_TTL_SECONDS,
      },
    );
    accessToken.addGrant({
      room: meeting.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return {
      serverUrl: this.liveKitConfig.publicUrl,
      token: await accessToken.toJwt(),
      roomName: meeting.roomName,
    };
  }
}
