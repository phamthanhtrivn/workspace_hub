import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MeetingEventType,
  MeetingParticipantStatus,
  MeetingRole,
  MeetingStatus,
  MeetingType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';
import type {
  CancelScheduledMeetingParams,
  CreateScheduledMeetingParams,
  ListUpcomingMeetingsParams,
  UpdateScheduledMeetingParams,
} from '../types/meeting.types';
import {
  DEFAULT_UPCOMING_LIMIT,
  MAX_UPCOMING_LIMIT,
} from '../types/meeting.constants';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import { createJoinToken, createRoomName } from '../utils/meeting.utils';
import { hashMeetingPassword } from '../utils/meeting-password.util';
import { MeetingSchedulePublisher } from '../events/meeting-schedule.publisher';
import { MeetingPresenterService } from './meeting-presenter.service';

type MeetingWithParticipants = Prisma.MeetingGetPayload<{
  include: { participants: true };
}>;

@Injectable()
export class MeetingScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly meetingPresenterService: MeetingPresenterService,
    private readonly meetingSchedulePublisher: MeetingSchedulePublisher,
  ) {}

  async createScheduledMeeting({
    userId,
    dto,
  }: CreateScheduledMeetingParams) {
    if (!userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const title = dto.title?.trim();
    if (!title) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.INVALID_SCHEDULE);
    }
    if (dto.recurrenceRule) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.MEETING_RECURRENCE_UNSUPPORTED,
      );
    }

    const scheduledStartAt = new Date(dto.scheduledStartAt);
    const scheduledEndAt = new Date(dto.scheduledEndAt);
    this.assertSchedulableRange(scheduledStartAt, scheduledEndAt);

    const inviteeIds = this.normalizeInviteeIds(userId, dto.inviteeIds);
    const now = new Date();
    const meeting = await this.prisma.$transaction(async (tx) => {
      const createdMeeting = await tx.meeting.create({
        data: {
          roomName: createRoomName(),
          joinToken: createJoinToken(),
          title,
          description: dto.description?.trim() || null,
          type: MeetingType.SCHEDULED,
          status: MeetingStatus.SCHEDULED,
          createdBy: userId,
          hostId: userId,
          scheduledStartAt,
          scheduledEndAt,
          passwordHash: hashMeetingPassword(dto.password),
          autoAdmit: dto.autoAdmit ?? false,
          chatEnabled: dto.chatEnabled ?? true,
          screenShareEnabled: dto.screenShareEnabled ?? true,
        },
      });

      await tx.meetingParticipant.createMany({
        data: [
          {
            meetingId: createdMeeting.id,
            userId,
            role: MeetingRole.HOST,
            status: MeetingParticipantStatus.INVITED,
            invitedAt: now,
            lastSeenAt: now,
          },
          ...inviteeIds.map((inviteeId) => ({
            meetingId: createdMeeting.id,
            userId: inviteeId,
            role: MeetingRole.PARTICIPANT,
            status: MeetingParticipantStatus.INVITED,
            invitedAt: now,
          })),
        ],
        skipDuplicates: true,
      });

      await tx.meetingEvent.create({
        data: {
          meetingId: createdMeeting.id,
          actorId: userId,
          type: MeetingEventType.CREATED,
          metadata: {
            scheduledStartAt: scheduledStartAt.toISOString(),
            scheduledEndAt: scheduledEndAt.toISOString(),
          },
        },
      });

      return tx.meeting.findUniqueOrThrow({
        where: { id: createdMeeting.id },
        include: { participants: true },
      });
    });

    await this.publishScheduledMeetingCreated(meeting);

    return this.toScheduledMeetingResponse(meeting);
  }

  async listUpcomingMeetings({ userId, query }: ListUpcomingMeetingsParams) {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(
      MAX_UPCOMING_LIMIT,
      Math.max(1, query?.limit ?? DEFAULT_UPCOMING_LIMIT),
    );
    const where: Prisma.MeetingWhereInput = {
      type: MeetingType.SCHEDULED,
      status: { in: [MeetingStatus.SCHEDULED, MeetingStatus.LIVE] },
      scheduledStartAt: { not: null },
      OR: [{ createdBy: userId }, { participants: { some: { userId } } }],
    };

    const [total, meetings] = await this.prisma.$transaction([
      this.prisma.meeting.count({ where }),
      this.prisma.meeting.findMany({
        where,
        include: { participants: true },
        orderBy: { scheduledStartAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const items = await Promise.all(
      meetings.map((meeting) => this.toUpcomingMeetingItem(meeting, userId)),
    );

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async updateScheduledMeeting({
    joinToken,
    userId,
    dto,
  }: UpdateScheduledMeetingParams) {
    const meeting = await this.assertScheduledMeetingModerator(
      joinToken,
      userId,
    );
    if (dto.recurrenceRule) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.MEETING_RECURRENCE_UNSUPPORTED,
      );
    }

    const nextStartAt = dto.scheduledStartAt
      ? new Date(dto.scheduledStartAt)
      : meeting.scheduledStartAt;
    const nextEndAt = dto.scheduledEndAt
      ? new Date(dto.scheduledEndAt)
      : meeting.scheduledEndAt;
    if (!nextStartAt || !nextEndAt) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.INVALID_SCHEDULE);
    }
    this.assertValidRange(nextStartAt, nextEndAt);

    const inviteeIds =
      dto.inviteeIds === undefined
        ? undefined
        : this.normalizeInviteeIds(meeting.hostId, dto.inviteeIds);
    const passwordHash =
      dto.password === undefined ? undefined : hashMeetingPassword(dto.password);

    const updatedMeeting = await this.prisma.$transaction(async (tx) => {
      await tx.meeting.update({
        where: { id: meeting.id },
        data: {
          title: dto.title?.trim(),
          description:
            dto.description === undefined
              ? undefined
              : dto.description?.trim() || null,
          scheduledStartAt: dto.scheduledStartAt ? nextStartAt : undefined,
          scheduledEndAt: dto.scheduledEndAt ? nextEndAt : undefined,
          passwordHash,
          autoAdmit: dto.autoAdmit,
          chatEnabled: dto.chatEnabled,
          screenShareEnabled: dto.screenShareEnabled,
        },
      });

      if (inviteeIds) {
        await tx.meetingParticipant.deleteMany({
          where: {
            meetingId: meeting.id,
            userId: { notIn: [meeting.hostId, ...inviteeIds] },
            role: MeetingRole.PARTICIPANT,
          },
        });
        await tx.meetingParticipant.createMany({
          data: inviteeIds.map((inviteeId) => ({
            meetingId: meeting.id,
            userId: inviteeId,
            role: MeetingRole.PARTICIPANT,
            status: MeetingParticipantStatus.INVITED,
            invitedAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      return tx.meeting.findUniqueOrThrow({
        where: { id: meeting.id },
        include: { participants: true },
      });
    });

    await this.publishScheduledMeetingUpdated(updatedMeeting);

    return this.toScheduledMeetingResponse(updatedMeeting);
  }

  async cancelScheduledMeeting({
    joinToken,
    userId,
  }: CancelScheduledMeetingParams) {
    const meeting = await this.assertScheduledMeetingModerator(
      joinToken,
      userId,
    );
    const cancelledAt = new Date();
    const cancelledMeeting = await this.prisma.$transaction(async (tx) => {
      await tx.meeting.update({
        where: { id: meeting.id },
        data: {
          status: MeetingStatus.CANCELLED,
          cancelledAt,
        },
      });
      await tx.meetingEvent.create({
        data: {
          meetingId: meeting.id,
          actorId: userId,
          type: MeetingEventType.CANCELLED,
          metadata: { cancelledAt: cancelledAt.toISOString() },
        },
      });
      return tx.meeting.findUniqueOrThrow({
        where: { id: meeting.id },
        include: { participants: true },
      });
    });

    await this.publishScheduledMeetingCancelled(cancelledMeeting);

    return this.toScheduledMeetingResponse(cancelledMeeting);
  }

  private async assertScheduledMeetingModerator(
    joinToken: string,
    userId: string,
  ): Promise<MeetingWithParticipants> {
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
    if (meeting.status !== MeetingStatus.SCHEDULED) {
      throw new BadRequestException(
        meeting.status === MeetingStatus.CANCELLED
          ? MEETING_ERROR_MESSAGES.MEETING_CANCELLED
          : MEETING_ERROR_MESSAGES.MEETING_ALREADY_ENDED,
      );
    }

    const participant = meeting.participants[0];
    const isModerator =
      meeting.hostId === userId ||
      participant?.role === MeetingRole.HOST ||
      participant?.role === MeetingRole.COHOST;
    if (!isModerator) {
      throw new ForbiddenException(
        MEETING_ERROR_MESSAGES.MEETING_MODERATOR_REQUIRED,
      );
    }

    return this.prisma.meeting.findUniqueOrThrow({
      where: { id: meeting.id },
      include: { participants: true },
    });
  }

  private assertSchedulableRange(startAt: Date, endAt: Date): void {
    this.assertValidRange(startAt, endAt);
    if (startAt <= new Date()) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.INVALID_SCHEDULE);
    }
  }

  private assertValidRange(startAt: Date, endAt: Date): void {
    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      endAt <= startAt
    ) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.INVALID_SCHEDULE);
    }
  }

  private normalizeInviteeIds(hostUserId: string, inviteeIds: string[] = []) {
    return [...new Set(inviteeIds)].filter(
      (inviteeId) => inviteeId && inviteeId !== hostUserId,
    );
  }

  private async publishScheduledMeetingCreated(
    meeting: MeetingWithParticipants,
  ) {
    const snapshot = this.toPublisherSnapshot(meeting);
    const profile = await this.getPublisherProfile(meeting.hostId);
    this.meetingSchedulePublisher.publishInvitationNotifications(
      snapshot,
      profile,
    );
  }

  private async publishScheduledMeetingUpdated(
    meeting: MeetingWithParticipants,
  ) {
    const snapshot = this.toPublisherSnapshot(meeting);
    const profile = await this.getPublisherProfile(meeting.hostId);
    this.meetingSchedulePublisher.publishUpdateNotifications(snapshot, profile);
  }

  private async publishScheduledMeetingCancelled(
    meeting: MeetingWithParticipants,
  ) {
    const snapshot = this.toPublisherSnapshot(meeting);
    const profile = await this.getPublisherProfile(meeting.hostId);
    this.meetingSchedulePublisher.publishCancellationNotifications(
      snapshot,
      profile,
    );
  }

  private toPublisherSnapshot(meeting: MeetingWithParticipants) {
    return {
      id: meeting.id,
      joinToken: meeting.joinToken,
      title: meeting.title,
      description: meeting.description,
      scheduledStartAt: meeting.scheduledStartAt!,
      scheduledEndAt: meeting.scheduledEndAt!,
      hostUserId: meeting.hostId,
      recipientUserIds: meeting.participants.map(
        (participant) => participant.userId,
      ),
    };
  }

  private async getPublisherProfile(userId: string) {
    const profiles =
      await this.userProfileSnapshotService.getProfilesByUserIds([userId]);
    const profile = profiles.get(userId);

    return {
      senderName: profile?.fullName ?? profile?.email ?? userId,
      senderAvatar: profile?.avatarUrl,
    };
  }

  private toScheduledMeetingResponse(meeting: MeetingWithParticipants) {
    return {
      id: meeting.id,
      joinToken: meeting.joinToken,
      title: meeting.title,
      description: meeting.description,
      type: meeting.type,
      status: meeting.status,
      scheduledStartAt: meeting.scheduledStartAt?.toISOString() ?? null,
      scheduledEndAt: meeting.scheduledEndAt?.toISOString() ?? null,
      autoAdmit: meeting.autoAdmit,
      chatEnabled: meeting.chatEnabled,
      screenShareEnabled: meeting.screenShareEnabled,
      requiresPassword: Boolean(meeting.passwordHash),
      participants: meeting.participants.map((participant) =>
        this.meetingPresenterService.toMeetingParticipantListItem(participant),
      ),
    };
  }

  private async toUpcomingMeetingItem(
    meeting: MeetingWithParticipants,
    userId: string,
  ) {
    const enrichedParticipants =
      await this.userProfileSnapshotService.attachProfilesToMembers(
        meeting.participants,
      );
    const hostProfile = (
      await this.userProfileSnapshotService.getProfilesByUserIds([
        meeting.hostId,
      ])
    ).get(meeting.hostId);

    return {
      id: meeting.id,
      joinToken: meeting.joinToken,
      title: meeting.title,
      description: meeting.description,
      type: meeting.type,
      status: meeting.status,
      scheduledStartAt: meeting.scheduledStartAt?.toISOString() ?? null,
      scheduledEndAt: meeting.scheduledEndAt?.toISOString() ?? null,
      hostUserId: meeting.hostId,
      hostProfile: hostProfile ?? null,
      myParticipant:
        enrichedParticipants.find((participant) => participant.userId === userId) ??
        null,
      participants: enrichedParticipants.map((participant) =>
        this.meetingPresenterService.toMeetingParticipantListItem(participant),
      ),
      participantCount: meeting.participants.length,
      autoAdmit: meeting.autoAdmit,
      chatEnabled: meeting.chatEnabled,
      screenShareEnabled: meeting.screenShareEnabled,
      requiresPassword: Boolean(meeting.passwordHash),
    };
  }
}
