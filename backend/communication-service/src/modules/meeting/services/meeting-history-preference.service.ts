import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import { MeetingRealtimeService } from './meeting-realtime.service';
import { lockMeetingHistory } from '../utils/meeting-history-visibility.utils';
import { HISTORY_MUTATION_TIMEOUT_MS } from '../types/meeting.constants';

@Injectable()
export class MeetingHistoryPreferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: MeetingRealtimeService,
  ) {}

  async updateVisibility(meetingId: string, userId: string, hidden: boolean) {
    if (!userId)
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);

    await this.prisma.$transaction(
      async (tx) => {
        await lockMeetingHistory(tx, userId);
        const meeting = await tx.meeting.findUnique({
          where: { id: meetingId },
          select: {
            status: true,
            participants: {
              where: { userId, joinedAt: { not: null } },
              select: { id: true },
              take: 1,
            },
          },
        });
        if (!meeting)
          throw new NotFoundException(MEETING_ERROR_MESSAGES.MEETING_NOT_FOUND);
        if (!meeting.participants.length) {
          throw new ForbiddenException(
            MEETING_ERROR_MESSAGES.HISTORY_ACCESS_REQUIRED,
          );
        }
        if (
          hidden &&
          meeting.status !== MeetingStatus.ENDED &&
          meeting.status !== MeetingStatus.CANCELLED
        ) {
          throw new BadRequestException(
            MEETING_ERROR_MESSAGES.HISTORY_TERMINAL_REQUIRED,
          );
        }
        const hiddenAt = hidden ? new Date() : null;
        await tx.meetingHistoryPreference.upsert({
          where: { meetingId_userId: { meetingId, userId } },
          create: { meetingId, userId, hiddenAt, hiddenBatchId: null },
          update: { hiddenAt, hiddenBatchId: null },
        });
      },
      { timeout: HISTORY_MUTATION_TIMEOUT_MS },
    );

    const result = { meetingId, hidden };
    this.realtime.emitUserEvent(
      userId,
      MeetingEvent.HISTORY_VISIBILITY_UPDATED,
      result,
    );
    return result;
  }
}
