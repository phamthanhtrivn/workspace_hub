import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
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

@Injectable()
export class MeetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  private get meetingClient() {
    return (this.prisma as any).meeting;
  }

  private get participantClient() {
    return (this.prisma as any).meetingParticipant;
  }

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

  private async assertHost(meetingId: string, userId: string) {
    const meeting = await this.meetingClient.findUnique({
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

  private async getMeetingOrThrow(meetingId: string) {
    const meeting = await this.meetingClient.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      throw new NotFoundException(MeetingErrorMessage.MEETING_NOT_FOUND);
    }
    return meeting;
  }

  private mapMeetingResponse(meeting: any, userId: string) {
    const participant = meeting.participants?.find(
      (item: any) => item.userId === userId,
    );
    const pendingJoinRequestCount =
      meeting._count?.participants ??
      meeting.participants?.filter(
        (item: any) =>
          item.status === MeetingParticipantStatusValue.REQUESTED,
      ).length ??
      0;

    return {
      ...meeting,
      joinUrl: this.buildJoinUrl(meeting.joinToken),
      currentParticipant: participant ?? null,
      pendingJoinRequestCount,
    };
  }

  async createInstantMeeting(userId: string, body: CreateInstantMeetingDto) {
    const title = body.title?.trim() || MeetingDefault.INSTANT_TITLE;
    const allowJoinWithoutApproval = body.allowJoinWithoutApproval ?? false;
    const now = new Date();

    const meeting = await this.prisma.$transaction(async (tx) => {
      const createdMeeting = await (tx as any).meeting.create({
        data: {
          roomName: this.buildRoomName(),
          joinToken: this.buildJoinToken(),
          title,
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
    });

    return this.mapMeetingResponse(meeting, userId);
  }

  async getUserMeetings(userId: string) {
    const meetings = await this.meetingClient.findMany({
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

    return meetings.map((meeting: any) =>
      this.mapMeetingResponse(meeting, userId),
    );
  }

  async getJoinInfoByToken(joinToken: string, userId: string) {
    const meeting = await this.meetingClient.findUnique({
      where: { joinToken },
      include: {
        participants: {
          where: { userId },
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

  async requestJoin(meetingId: string, userId: string) {
    const meeting = await this.getMeetingOrThrow(meetingId);
    if (meeting.status !== MeetingStatusValue.LIVE) {
      throw new BadRequestException(MeetingErrorMessage.MEETING_NOT_LIVE);
    }

    const now = new Date();
    const nextStatus = meeting.allowJoinWithoutApproval
      ? MeetingParticipantStatusValue.JOINED
      : MeetingParticipantStatusValue.REQUESTED;

    const participant = await this.prisma.$transaction(async (tx) => {
      const updatedParticipant = await (tx as any).meetingParticipant.upsert({
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

      await (tx as any).meetingEvent.create({
        data: {
          meetingId,
          actorId: userId,
          type: MeetingEventTypeValue.PARTICIPANT_JOINED,
          metadata: { status: nextStatus },
        },
      });

      return updatedParticipant;
    });

    if (nextStatus === MeetingParticipantStatusValue.REQUESTED) {
      this.chatGateway.emitMeetingJoinRequested(meetingId, userId, participant);
    } else {
      this.chatGateway.emitMeetingJoinApproved(meetingId, userId, participant);
    }

    return {
      participant,
      meeting: {
        ...meeting,
        joinUrl: this.buildJoinUrl(meeting.joinToken),
      },
    };
  }

  async getJoinRequests(meetingId: string, userId: string) {
    await this.assertHost(meetingId, userId);
    return this.participantClient.findMany({
      where: {
        meetingId,
        status: MeetingParticipantStatusValue.REQUESTED,
      },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async approveJoinRequest(meetingId: string, requesterId: string, hostId: string) {
    await this.assertHost(meetingId, hostId);
    if (requesterId === hostId) {
      throw new BadRequestException(MeetingErrorMessage.SELF_REVIEW_NOT_ALLOWED);
    }

    const participant = await this.participantClient.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId: requesterId,
        },
      },
    });

    if (
      !participant ||
      participant.status !== MeetingParticipantStatusValue.REQUESTED
    ) {
      throw new NotFoundException(MeetingErrorMessage.REQUEST_NOT_FOUND);
    }

    const updatedParticipant = await this.participantClient.update({
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

    this.chatGateway.emitMeetingJoinApproved(
      meetingId,
      requesterId,
      updatedParticipant,
    );
    return updatedParticipant;
  }

  async rejectJoinRequest(meetingId: string, requesterId: string, hostId: string) {
    await this.assertHost(meetingId, hostId);
    if (requesterId === hostId) {
      throw new BadRequestException(MeetingErrorMessage.SELF_REVIEW_NOT_ALLOWED);
    }

    const participant = await this.participantClient.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId: requesterId,
        },
      },
    });

    if (
      !participant ||
      participant.status !== MeetingParticipantStatusValue.REQUESTED
    ) {
      throw new NotFoundException(MeetingErrorMessage.REQUEST_NOT_FOUND);
    }

    const updatedParticipant = await this.participantClient.update({
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

    this.chatGateway.emitMeetingJoinRejected(
      meetingId,
      requesterId,
      updatedParticipant,
    );
    return updatedParticipant;
  }

  async updateAccess(
    meetingId: string,
    userId: string,
    allowJoinWithoutApproval: boolean,
  ) {
    await this.assertHost(meetingId, userId);
    const meeting = await this.meetingClient.update({
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

    this.chatGateway.emitMeetingAccessUpdated(
      meetingId,
      allowJoinWithoutApproval,
    );
    return this.mapMeetingResponse(meeting, userId);
  }
}
