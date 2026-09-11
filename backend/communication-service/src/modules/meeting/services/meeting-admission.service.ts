import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MeetingEventType,
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import type {
  ListJoinRequestsParams,
  MeetingJoinRequestParams,
  MeetingModeratorParams,
  ResolveJoinRequestParams,
} from '../types/meeting.types';
import { MeetingPolicyService } from './meeting-policy.service';
import { MeetingPresenterService } from './meeting-presenter.service';
import { MeetingRealtimeService } from './meeting-realtime.service';

@Injectable()
export class MeetingAdmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly meetingPolicyService: MeetingPolicyService,
    private readonly meetingPresenterService: MeetingPresenterService,
    private readonly meetingRealtimeService: MeetingRealtimeService,
  ) {}

  async requestJoinApproval({ joinToken, userId }: MeetingJoinRequestParams) {
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

    const payload = this.meetingPresenterService.toJoinRequestSocketPayload(
      meeting.id,
      request,
    );
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.JOIN_REQUESTED,
      payload,
    );
    this.meetingRealtimeService.emitUserEvent(
      userId,
      MeetingEvent.JOIN_REQUEST_UPDATED,
      payload,
    );

    return {
      meetingId: meeting.id,
      joinToken: meeting.joinToken,
      participantStatus: request.status,
    };
  }

  async listJoinRequests({ joinToken, userId, query }: ListJoinRequestsParams) {
    const { meeting } = await this.meetingPolicyService.assertMeetingModerator({
      joinToken,
      userId,
    });
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(50, Math.max(1, query?.limit ?? 10));
    const search = query?.search?.trim();
    const where: Prisma.MeetingParticipantWhereInput = {
      meetingId: meeting.id,
      status: MeetingParticipantStatus.REQUESTED,
    };

    if (search) {
      where.userId =
        await this.meetingPolicyService.getUserIdSearchFilter(search);
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
    return this.resolveAllJoinRequests(
      params,
      MeetingParticipantStatus.APPROVED,
    );
  }

  async declineAllJoinRequests(params: MeetingModeratorParams) {
    return this.resolveAllJoinRequests(
      params,
      MeetingParticipantStatus.REJECTED,
    );
  }

  private async resolveJoinRequest(
    { joinToken, userId, targetUserId }: ResolveJoinRequestParams,
    status: MeetingParticipantStatus,
  ) {
    const { meeting } = await this.meetingPolicyService.assertMeetingModerator({
      joinToken,
      userId,
    });
    const request = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId: meeting.id,
          userId: targetUserId,
        },
      },
    });

    if (!request || request.status !== MeetingParticipantStatus.REQUESTED) {
      throw new NotFoundException(
        MEETING_ERROR_MESSAGES.JOIN_REQUEST_NOT_FOUND,
      );
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

    const payload = this.meetingPresenterService.toJoinRequestSocketPayload(
      meeting.id,
      updatedRequest,
    );
    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.JOIN_REQUEST_UPDATED,
      payload,
    );
    this.meetingRealtimeService.emitUserEvent(
      targetUserId,
      MeetingEvent.JOIN_REQUEST_UPDATED,
      payload,
    );

    return payload;
  }

  private async resolveAllJoinRequests(
    { joinToken, userId }: MeetingModeratorParams,
    status: MeetingParticipantStatus,
  ) {
    const { meeting } = await this.meetingPolicyService.assertMeetingModerator({
      joinToken,
      userId,
    });
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
      const payload = this.meetingPresenterService.toJoinRequestSocketPayload(
        meeting.id,
        {
          ...request,
          status,
        },
      );
      this.meetingRealtimeService.emitUserEvent(
        request.userId,
        MeetingEvent.JOIN_REQUEST_UPDATED,
        payload,
      );
    }

    this.meetingRealtimeService.emitMeetingEvent(
      meeting.id,
      MeetingEvent.JOIN_REQUEST_UPDATED,
      {
        meetingId: meeting.id,
        status,
        count: requests.length,
      },
    );

    return { count: requests.length };
  }
}
