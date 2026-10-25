import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingEvent } from '../../socket/meeting/meeting-socket.events';
import { BulkUpdateMeetingHistoryVisibilityDto } from '../dto/bulk-update-meeting-history-visibility.dto';
import {
  HISTORY_BULK_CHUNK_SIZE,
  HISTORY_MUTATION_TIMEOUT_MS,
} from '../types/meeting.constants';
import {
  MEETING_ERROR_MESSAGES,
  MeetingHistoryBulkScope,
} from '../types/meeting.enums';
import {
  lockMeetingHistory,
  meetingHistoryMutationWhere,
} from '../utils/meeting-history-visibility.utils';
import { MeetingRealtimeService } from './meeting-realtime.service';

@Injectable()
export class MeetingHistoryBulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: MeetingRealtimeService,
  ) {}

  async updateVisibility(
    userId: string,
    dto: BulkUpdateMeetingHistoryVisibilityDto,
  ) {
    if (!userId)
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    if (
      dto.scope === MeetingHistoryBulkScope.ALL &&
      dto.meetingIds !== undefined
    ) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.HISTORY_SCOPE_INVALID,
      );
    }
    if (
      dto.scope === MeetingHistoryBulkScope.ALL &&
      dto.expectedCount === undefined
    ) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.HISTORY_CONFIRMATION_REQUIRED,
      );
    }
    if (
      dto.scope === MeetingHistoryBulkScope.SELECTED &&
      !dto.meetingIds?.length
    ) {
      throw new BadRequestException(
        MEETING_ERROR_MESSAGES.HISTORY_SELECTION_REQUIRED,
      );
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        await lockMeetingHistory(tx, userId);
        const selectedIds =
          dto.scope === MeetingHistoryBulkScope.SELECTED
            ? dto.meetingIds
            : undefined;
        if (selectedIds) {
          const selected = await tx.meeting.findMany({
            where: {
              id: { in: selectedIds },
              participants: { some: { userId, joinedAt: { not: null } } },
            },
            select: { id: true, status: true },
          });
          if (selected.length !== selectedIds.length)
            throw new ForbiddenException(
              MEETING_ERROR_MESSAGES.HISTORY_ACCESS_REQUIRED,
            );
          if (
            dto.hidden &&
            selected.some(
              (meeting) =>
                meeting.status !== MeetingStatus.ENDED &&
                meeting.status !== MeetingStatus.CANCELLED,
            )
          ) {
            throw new BadRequestException(
              MEETING_ERROR_MESSAGES.HISTORY_TERMINAL_REQUIRED,
            );
          }
        }
        const targets = await tx.meeting.findMany({
          where: {
            ...meetingHistoryMutationWhere(userId, dto.hidden),
            ...(selectedIds ? { id: { in: selectedIds } } : {}),
          },
          select: { id: true },
        });
        if (
          dto.expectedCount !== undefined &&
          dto.expectedCount !== targets.length
        ) {
          throw new ConflictException(
            MEETING_ERROR_MESSAGES.HISTORY_SELECTION_CHANGED,
          );
        }
        const batchId = dto.hidden && targets.length ? randomUUID() : null;
        const hiddenAt = dto.hidden ? new Date() : null;
        for (
          let offset = 0;
          offset < targets.length;
          offset += HISTORY_BULK_CHUNK_SIZE
        ) {
          const chunk = targets.slice(offset, offset + HISTORY_BULK_CHUNK_SIZE);
          if (dto.hidden) {
            await tx.meetingHistoryPreference.createMany({
              data: chunk.map(({ id }) => ({
                meetingId: id,
                userId,
                hiddenAt,
                hiddenBatchId: batchId,
              })),
              skipDuplicates: true,
            });
          }
          await tx.meetingHistoryPreference.updateMany({
            where: { userId, meetingId: { in: chunk.map(({ id }) => id) } },
            data: { hiddenAt, hiddenBatchId: batchId },
          });
        }
        return { hidden: dto.hidden, affectedCount: targets.length, batchId };
      },
      { timeout: HISTORY_MUTATION_TIMEOUT_MS },
    );
    this.realtime.emitUserEvent(
      userId,
      MeetingEvent.HISTORY_VISIBILITY_UPDATED,
      result,
    );
    return result;
  }

  async undoBatch(userId: string, batchId: string) {
    if (!userId)
      throw new BadRequestException(MEETING_ERROR_MESSAGES.MISSING_USER_ID);
    const changed = await this.prisma.$transaction(
      async (tx) => {
        await lockMeetingHistory(tx, userId);
        return tx.meetingHistoryPreference.updateMany({
          where: {
            userId,
            hiddenBatchId: batchId,
            hiddenAt: { not: null },
            meeting: {
              participants: { some: { userId, joinedAt: { not: null } } },
            },
          },
          data: { hiddenAt: null, hiddenBatchId: null },
        });
      },
      { timeout: HISTORY_MUTATION_TIMEOUT_MS },
    );
    const result = {
      hidden: false,
      affectedCount: changed.count,
      batchId: null,
    };
    this.realtime.emitUserEvent(
      userId,
      MeetingEvent.HISTORY_VISIBILITY_UPDATED,
      result,
    );
    return result;
  }
}
