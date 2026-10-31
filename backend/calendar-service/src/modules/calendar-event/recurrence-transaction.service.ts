import { MutationEffect } from './recurrence-mutation.types';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Calendar, EventStatus, Prisma } from '@prisma/client';
import {
  CALENDAR_DEFAULTS,
  CALENDAR_ERROR_MESSAGES,
} from '../../common/constants/calendar.constants';
import { RecurrenceScope } from '../../common/enums/calendar.enum';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EventWithRelations,
  eventWithRelationsInclude,
} from './calendar-event.types';
import { CalendarRecurrenceService } from './calendar-recurrence.service';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { RecurrenceSingleMutationService } from './recurrence-single-mutation.service';
import { RecurrenceFollowingMutationService } from './recurrence-following-mutation.service';
import { RecurrenceEntireMutationService } from './recurrence-entire-mutation.service';
import { RecurrenceOccurrenceService } from './recurrence-occurrence.service';

@Injectable()
export class RecurrenceTransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recurrence: CalendarRecurrenceService,
    private readonly single: RecurrenceSingleMutationService,
    private readonly following: RecurrenceFollowingMutationService,
    private readonly entire: RecurrenceEntireMutationService,
    private readonly occurrences: RecurrenceOccurrenceService,
  ) {}
  async withLockedEvent<T>(
    event: EventWithRelations,
    operation: (
      tx: Prisma.TransactionClient,
      current: EventWithRelations,
    ) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        if (event.recurrenceSeriesId) {
          await this.recurrence.lockSeries(tx, event.recurrenceSeriesId);
        }
        const current = await tx.calendarEvent.findUnique({
          where: { id: event.id },
          include: eventWithRelationsInclude,
        });
        if (
          !current ||
          current.recurrenceSeriesId !== event.recurrenceSeriesId
        ) {
          throw new NotFoundException(CALENDAR_ERROR_MESSAGES.EVENT_NOT_FOUND);
        }
        return operation(tx, current);
      },
      { timeout: CALENDAR_DEFAULTS.RECURRENCE_TRANSACTION_TIMEOUT_MS },
    );
  }

  async updateRecurringEvent(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    afterMutation?: MutationEffect,
  ): Promise<string> {
    return this.withLockedEvent(event, async (tx, current) => {
      const updatedId = await this.updateRecurringEventInTransaction(
        userId,
        current,
        calendar,
        dto,
        tx,
      );
      await afterMutation?.(tx, updatedId);
      return updatedId;
    });
  }

  async updateRecurringEventInTransaction(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    if (dto.recurrenceRule === null) {
      return this.single.removeRecurrence(userId, event, calendar, dto, tx);
    }
    const scope = dto.recurrenceScope ?? RecurrenceScope.THIS;
    if (scope === RecurrenceScope.THIS) {
      if (
        dto.recurrenceRule !== undefined &&
        dto.recurrenceRule !== event.recurrenceSeries!.recurrenceRule
      ) {
        throw new BadRequestException(
          CALENDAR_ERROR_MESSAGES.RECURRENCE_SCOPE_REQUIRED,
        );
      }
      return this.single.updateSingleOccurrence(
        userId,
        event,
        calendar,
        dto,
        tx,
      );
    }
    if (scope === RecurrenceScope.THIS_AND_FOLLOWING) {
      return this.following.updateThisAndFollowing(
        userId,
        event,
        calendar,
        dto,
        tx,
      );
    }
    return this.entire.updateEntireSeries(userId, event, calendar, dto, tx);
  }

  async cancelEvent(
    userId: string,
    event: EventWithRelations,
    scope: RecurrenceScope,
    afterMutation?: MutationEffect,
  ): Promise<void> {
    return this.withLockedEvent(event, async (tx, current) => {
      await this.cancelEventInTransaction(userId, current, scope, tx);
      await afterMutation?.(tx, event.id);
    });
  }

  async cancelEventInTransaction(
    userId: string,
    event: EventWithRelations,
    scope: RecurrenceScope,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (!event.recurrenceSeries || scope === RecurrenceScope.THIS) {
      await this.occurrences.cancelOccurrencesInTransaction(
        tx,
        userId,
        [event.id],
        true,
      );
      return;
    }

    const seriesId = event.recurrenceSeries.id;
    if (scope === RecurrenceScope.ALL) {
      const occurrenceIds = await this.occurrences.getSeriesOccurrenceIds(
        seriesId,
        tx,
      );
      await tx.recurrenceSeries.update({
        where: { id: seriesId },
        data: {
          status: EventStatus.CANCELLED,
          updatedBy: userId,
          cancelledAt: new Date(),
        },
      });
      await this.occurrences.cancelOccurrencesInTransaction(
        tx,
        userId,
        occurrenceIds,
        false,
      );
      return;
    }

    const cutoff = event.originalStartAt ?? event.startAt;
    const occurrenceIds = await this.occurrences.getSeriesOccurrenceIds(
      seriesId,
      tx,
      cutoff,
    );
    await tx.recurrenceSeries.update({
      where: { id: seriesId },
      data: {
        recurrenceRule: this.recurrence.truncateBefore(
          event.recurrenceSeries.recurrenceRule,
          cutoff,
          event.recurrenceSeries.timeZone,
        ),
        recurrenceGeneratedUntil: new Date(cutoff.getTime() - 1),
        updatedBy: userId,
      },
    });
    await this.occurrences.cancelOccurrencesInTransaction(
      tx,
      userId,
      occurrenceIds,
      false,
    );
  }
}
