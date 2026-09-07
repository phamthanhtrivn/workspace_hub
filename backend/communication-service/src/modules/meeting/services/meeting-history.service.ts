import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import type { ListMeetingHistoryParams } from '../types/meeting.types';
import { MeetingPresenterService } from './meeting-presenter.service';
import { DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT, PARTICIPANT_PREVIEW_LIMIT } from '../types/meeting.constants';

function normalizePositiveNumber(value: unknown, fallback: number) {
  const numericValue =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10);

  return Number.isFinite(numericValue) ? Math.max(1, numericValue) : fallback;
}

@Injectable()
export class MeetingHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly meetingPresenterService: MeetingPresenterService,
  ) {}

  async listMeetingHistory({ userId, query }: ListMeetingHistoryParams) {
    if (!userId) {
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    }

    const page = normalizePositiveNumber(query?.page, 1);
    const limit = Math.min(
      MAX_HISTORY_LIMIT,
      normalizePositiveNumber(query?.limit, DEFAULT_HISTORY_LIMIT),
    );
    const joinedParticipantWhere: Prisma.MeetingParticipantWhereInput = {
      userId,
      joinedAt: { not: null },
    };
    const meetingWhere: Prisma.MeetingWhereInput = {
      participants: {
        some: joinedParticipantWhere,
      },
    };

    const [total, meetings] = await this.prisma.$transaction([
      this.prisma.meeting.count({ where: meetingWhere }),
      this.prisma.meeting.findMany({
        where: meetingWhere,
        select: {
          id: true,
          joinToken: true,
          type: true,
          status: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
          _count: {
            select: {
              participants: {
                where: {
                  joinedAt: { not: null },
                },
              },
            },
          },
        },
        orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const meetingIds = meetings.map((meeting) => meeting.id);

    if (meetingIds.length === 0) {
      return {
        items: [],
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    const [myParticipants, participantPreviews] = await Promise.all([
      this.prisma.meetingParticipant.findMany({
        where: {
          meetingId: { in: meetingIds },
          userId,
          joinedAt: { not: null },
        },
      }),
      Promise.all(
        meetingIds.map((meetingId) =>
          this.prisma.meetingParticipant.findMany({
            where: {
              meetingId,
              joinedAt: { not: null },
            },
            orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
            take: PARTICIPANT_PREVIEW_LIMIT,
          }),
        ),
      ),
    ]);
    const enrichedMyParticipants =
      await this.userProfileSnapshotService.attachProfilesToMembers(
        myParticipants,
      );
    const enrichedParticipantPreviews =
      await this.userProfileSnapshotService.attachProfilesToMembers(
        participantPreviews.flat(),
      );
    const myParticipantByMeetingId = new Map(
      enrichedMyParticipants.map((participant) => [
        participant.meetingId,
        participant,
      ]),
    );
    const previewParticipantsByMeetingId = new Map<
      string,
      typeof enrichedParticipantPreviews
    >();

    for (const participant of enrichedParticipantPreviews) {
      const participants =
        previewParticipantsByMeetingId.get(participant.meetingId) ?? [];
      participants.push(participant);
      previewParticipantsByMeetingId.set(participant.meetingId, participants);
    }

    return {
      items: meetings.flatMap((meeting) => {
        const myParticipant = myParticipantByMeetingId.get(meeting.id);

        if (!myParticipant) return [];

        return [
          this.meetingPresenterService.toMeetingHistoryItem(
            meeting,
            myParticipant,
            previewParticipantsByMeetingId.get(meeting.id) ?? [],
            meeting._count.participants,
          ),
        ];
      }),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
