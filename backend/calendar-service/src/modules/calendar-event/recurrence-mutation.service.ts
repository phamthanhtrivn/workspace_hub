import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Calendar,
  EventSourceType,
  EventStatus,
  EventVisibility,
  Prisma,
  ReminderDeliveryStatus,
  RecurrenceException,
} from '@prisma/client';
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
import { CalendarEventAttendeeDto } from './dto/calendar-event-attendee.dto';
import { CalendarEventReminderDto } from './dto/calendar-event-reminder.dto';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { EventRelationService } from './event-relation.service';

@Injectable()
export class RecurrenceMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recurrence: CalendarRecurrenceService,
    private readonly relations: EventRelationService,
  ) {}

  async createRecurringEvent(
    userId: string,
    calendar: Calendar,
    dto: CreateCalendarEventDto,
    attendees: CalendarEventAttendeeDto[],
    reminders: CalendarEventReminderDto[],
  ): Promise<string> {
    return this.prisma.$transaction(
      async (tx) => {
        const created = await tx.recurrenceSeries.create({
          data: {
            calendarId: calendar.id,
            createdBy: userId,
            title: dto.title,
            description: dto.description ?? null,
            location: dto.location ?? null,
            startAt: new Date(dto.startAt),
            endAt: new Date(dto.endAt),
            allDay: dto.allDay ?? false,
            color: dto.color ?? calendar.color,
            status: dto.status ?? EventStatus.CONFIRMED,
            visibility: dto.visibility ?? EventVisibility.DEFAULT,
            sourceType: dto.sourceType ?? EventSourceType.USER,
            recurrenceRule: dto.recurrenceRule!,
            timeZone: calendar.timeZone,
          },
        });
        await this.relations.createSeriesRelations(tx, created.id, {
          attendees,
          reminders,
          documentIds: dto.documentIds ?? [],
          exceptionDates: dto.exceptionDates ?? [],
        });
        await this.materializeSeries(created.id, created.startAt, tx);
        return this.findFirstSeriesOccurrenceId(created.id, undefined, tx);
      },
      { timeout: CALENDAR_DEFAULTS.RECURRENCE_TRANSACTION_TIMEOUT_MS },
    );
  }

  async convertStandaloneToSeries(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
  ): Promise<string> {
    const attendees = dto.attendees
      ? this.relations.normalizeAttendees(userId, dto.attendees)
      : event.attendees.map(({ userId, optional }) => ({ userId, optional }));
    const reminders = dto.reminders
      ? this.relations.normalizeReminders(dto.reminders)
      : event.reminders.map(({ minutesBefore, method }) => ({
          minutesBefore,
          method,
        }));
    const startAt = dto.startAt ? new Date(dto.startAt) : event.startAt;

    return this.prisma.$transaction(
      async (tx) => {
        const series = await tx.recurrenceSeries.create({
          data: {
            calendarId: calendar.id,
            createdBy: event.createdBy,
            updatedBy: userId,
            title: dto.title ?? event.title,
            description:
              dto.description === undefined
                ? event.description
                : dto.description,
            location:
              dto.location === undefined ? event.location : dto.location,
            startAt,
            endAt: dto.endAt ? new Date(dto.endAt) : event.endAt,
            allDay: dto.allDay ?? event.allDay,
            color: dto.color === undefined ? event.color : dto.color,
            status: dto.status ?? event.status,
            visibility: dto.visibility ?? event.visibility,
            sourceType: event.sourceType,
            recurrenceRule: dto.recurrenceRule!,
            timeZone: calendar.timeZone,
          },
        });
        await this.relations.createSeriesRelations(tx, series.id, {
          attendees,
          reminders,
          documentIds:
            dto.documentIds ?? event.documents.map((item) => item.documentId),
          exceptionDates: dto.exceptionDates ?? [],
        });
        await tx.calendarEvent.delete({ where: { id: event.id } });
        await this.materializeSeries(series.id, startAt, tx);
        return this.findFirstSeriesOccurrenceId(series.id, undefined, tx);
      },
      { timeout: CALENDAR_DEFAULTS.RECURRENCE_TRANSACTION_TIMEOUT_MS },
    );
  }

  async updateRecurringEvent(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
  ): Promise<string> {
    return this.withLockedEvent(event, async (tx, current) =>
      this.updateRecurringEventInTransaction(
        userId,
        current,
        calendar,
        dto,
        tx,
      ),
    );
  }

  private async withLockedEvent<T>(
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

  private async updateRecurringEventInTransaction(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    if (dto.recurrenceRule === null) {
      return this.removeRecurrence(userId, event, calendar, dto, tx);
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
      return this.updateSingleOccurrence(userId, event, calendar, dto, tx);
    }
    if (scope === RecurrenceScope.THIS_AND_FOLLOWING) {
      return this.updateThisAndFollowing(userId, event, calendar, dto, tx);
    }
    return this.updateEntireSeries(userId, event, calendar, dto, tx);
  }

  async cancelEvent(
    userId: string,
    event: EventWithRelations,
    scope: RecurrenceScope,
  ): Promise<void> {
    return this.withLockedEvent(event, (tx, current) =>
      this.cancelEventInTransaction(userId, current, scope, tx),
    );
  }

  private async cancelEventInTransaction(
    userId: string,
    event: EventWithRelations,
    scope: RecurrenceScope,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (!event.recurrenceSeries || scope === RecurrenceScope.THIS) {
      await this.cancelOccurrencesInTransaction(tx, userId, [event.id], true);
      return;
    }

    const seriesId = event.recurrenceSeries.id;
    if (scope === RecurrenceScope.ALL) {
      const occurrenceIds = await this.getSeriesOccurrenceIds(seriesId, tx);
      await tx.recurrenceSeries.update({
        where: { id: seriesId },
        data: {
          status: EventStatus.CANCELLED,
          updatedBy: userId,
          cancelledAt: new Date(),
        },
      });
      await this.cancelOccurrencesInTransaction(
        tx,
        userId,
        occurrenceIds,
        false,
      );
      return;
    }

    const cutoff = event.originalStartAt ?? event.startAt;
    const occurrenceIds = await this.getSeriesOccurrenceIds(
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
    await this.cancelOccurrencesInTransaction(tx, userId, occurrenceIds, false);
  }

  private async updateSingleOccurrence(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const nextStartAt = dto.startAt ? new Date(dto.startAt) : event.startAt;
    const nextEndAt = dto.endAt ? new Date(dto.endAt) : event.endAt;
    await tx.calendarEvent.update({
      where: { id: event.id },
      data: {
        calendarId: calendar.id,
        updatedBy: userId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startAt: dto.startAt ? nextStartAt : undefined,
        endAt: dto.endAt ? nextEndAt : undefined,
        allDay: dto.allDay,
        color: dto.color,
        status: dto.status,
        visibility: dto.visibility,
        isRecurrenceOverride: true,
        cancelledAt: this.getCancelledAt(dto.status),
      },
    });
    await this.relations.replaceEventRelations(tx, event, nextStartAt, dto);
    return event.id;
  }

  private async removeRecurrence(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const series = event.recurrenceSeries!;
    const scope = dto.recurrenceScope ?? RecurrenceScope.THIS;
    const cutoff = event.originalStartAt ?? event.startAt;
    const nextStartAt = dto.startAt ? new Date(dto.startAt) : event.startAt;
    const nextEndAt = dto.endAt ? new Date(dto.endAt) : event.endAt;

    if (scope === RecurrenceScope.ALL) {
      const standalone = await tx.calendarEvent.create({
        data: this.getStandaloneEventData(
          userId,
          event,
          calendar,
          dto,
          nextStartAt,
          nextEndAt,
        ),
      });
      await this.relations.copyOccurrenceRelations(
        tx,
        standalone.id,
        event,
        dto,
        nextStartAt,
      );
      await tx.recurrenceSeries.delete({ where: { id: series.id } });
      return standalone.id;
    }

    if (scope === RecurrenceScope.THIS) {
      await tx.recurrenceException.createMany({
        data: [{ seriesId: series.id, occurrenceStart: cutoff }],
        skipDuplicates: true,
      });
    } else {
      await tx.recurrenceSeries.update({
        where: { id: series.id },
        data: {
          recurrenceRule: this.recurrence.truncateBefore(
            series.recurrenceRule,
            cutoff,
            series.timeZone,
          ),
          recurrenceGeneratedUntil: new Date(cutoff.getTime() - 1),
          updatedBy: userId,
        },
      });
      await tx.calendarEvent.deleteMany({
        where: {
          recurrenceSeriesId: series.id,
          originalStartAt: { gte: cutoff },
          id: { not: event.id },
        },
      });
    }
    await tx.calendarEvent.update({
      where: { id: event.id },
      data: {
        ...this.getStandaloneEventData(
          userId,
          event,
          calendar,
          dto,
          nextStartAt,
          nextEndAt,
        ),
        recurrenceSeriesId: null,
        originalStartAt: null,
        isRecurrenceOverride: false,
      },
    });
    await this.relations.replaceEventRelations(tx, event, nextStartAt, dto);
    return event.id;
  }

  private async updateEntireSeries(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const series = event.recurrenceSeries!;
    const startDelta = dto.startAt
      ? new Date(dto.startAt).getTime() - event.startAt.getTime()
      : 0;
    const endDelta = dto.endAt
      ? new Date(dto.endAt).getTime() - event.endAt.getTime()
      : startDelta;
    const nextSeriesStart = new Date(series.startAt.getTime() + startDelta);
    const nextSeriesEnd = new Date(series.endAt.getTime() + endDelta);
    this.assertSeriesRange(nextSeriesStart, nextSeriesEnd);
    this.recurrence.assertHasOccurrence(
      dto.recurrenceRule ?? series.recurrenceRule,
      nextSeriesStart,
      calendar.timeZone,
    );
    const recurrenceChanged =
      dto.recurrenceRule !== undefined &&
      dto.recurrenceRule !== series.recurrenceRule;
    const timeChanged =
      (dto.startAt !== undefined &&
        new Date(dto.startAt).getTime() !== event.startAt.getTime()) ||
      (dto.endAt !== undefined &&
        new Date(dto.endAt).getTime() !== event.endAt.getTime());
    const regenerate =
      timeChanged || recurrenceChanged || calendar.timeZone !== series.timeZone;
    let selectedOverridePreserved = false;

    await tx.recurrenceSeries.update({
      where: { id: series.id },
      data: {
        calendarId: calendar.id,
        updatedBy: userId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startAt: dto.startAt ? nextSeriesStart : undefined,
        endAt: dto.endAt || dto.startAt ? nextSeriesEnd : undefined,
        allDay: dto.allDay,
        color: dto.color,
        status: dto.status,
        visibility: dto.visibility,
        recurrenceRule: dto.recurrenceRule ?? undefined,
        timeZone: calendar.timeZone,
        recurrenceGeneratedUntil: regenerate ? null : undefined,
        cancelledAt: this.getCancelledAt(dto.status),
      },
    });
    await this.relations.replaceSeriesRelations(
      tx,
      series.id,
      event.createdBy,
      dto,
    );

    if (regenerate) {
      await tx.calendarEvent.deleteMany({
        where: {
          recurrenceSeriesId: series.id,
          isRecurrenceOverride: false,
        },
      });
      const overrides = await tx.calendarEvent.findMany({
        where: {
          recurrenceSeriesId: series.id,
          isRecurrenceOverride: true,
        },
        include: eventWithRelationsInclude,
        orderBy: { originalStartAt: startDelta > 0 ? 'desc' : 'asc' },
      });
      selectedOverridePreserved = overrides.some(({ id }) => id === event.id);
      for (const occurrence of overrides) {
        await this.updatePreservedOverride(
          tx,
          userId,
          occurrence,
          calendar,
          dto,
          series.id,
          startDelta,
          event.id,
        );
      }
      if (dto.exceptionDates === undefined) {
        await this.shiftSeriesExceptions(
          tx,
          series.id,
          series.exceptions,
          startDelta,
        );
      }
      await this.materializeSeries(series.id, nextSeriesStart, tx);
      if (selectedOverridePreserved) return event.id;
      return this.findFirstSeriesOccurrenceId(
        series.id,
        new Date(
          (event.originalStartAt ?? event.startAt).getTime() + startDelta,
        ),
        tx,
      );
    }
    const occurrences = await tx.calendarEvent.findMany({
      where: { recurrenceSeriesId: series.id },
      include: eventWithRelationsInclude,
    });
    for (const occurrence of occurrences) {
      await tx.calendarEvent.update({
        where: { id: occurrence.id },
        data: {
          calendarId: calendar.id,
          updatedBy: userId,
          title: dto.title,
          description: dto.description,
          location: dto.location,
          allDay: dto.allDay,
          color: dto.color,
          status: dto.status,
          visibility: dto.visibility,
        },
      });
      await this.relations.replaceEventRelations(
        tx,
        occurrence,
        occurrence.startAt,
        dto,
      );
    }
    return event.id;
  }

  private async updateThisAndFollowing(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const series = event.recurrenceSeries!;
    const cutoff = event.originalStartAt ?? event.startAt;
    const startDelta = dto.startAt
      ? new Date(dto.startAt).getTime() - event.startAt.getTime()
      : 0;
    const endDelta = dto.endAt
      ? new Date(dto.endAt).getTime() - event.endAt.getTime()
      : startDelta;
    const nextStartAt = new Date(cutoff.getTime() + startDelta);
    const nextEndAt = new Date(
      cutoff.getTime() +
        series.endAt.getTime() -
        series.startAt.getTime() +
        endDelta,
    );
    const nextRule =
      dto.recurrenceRule && dto.recurrenceRule !== series.recurrenceRule
        ? dto.recurrenceRule
        : this.recurrence.remainingRule(
            series.recurrenceRule,
            series.startAt,
            cutoff,
            series.timeZone,
          );

    this.assertSeriesRange(nextStartAt, nextEndAt);
    this.recurrence.assertHasOccurrence(
      nextRule,
      nextStartAt,
      calendar.timeZone,
    );

    await tx.recurrenceSeries.update({
      where: { id: series.id },
      data: {
        recurrenceRule: this.recurrence.truncateBefore(
          series.recurrenceRule,
          cutoff,
          series.timeZone,
        ),
        recurrenceGeneratedUntil: new Date(cutoff.getTime() - 1),
        updatedBy: userId,
      },
    });
    await tx.calendarEvent.deleteMany({
      where: {
        recurrenceSeriesId: series.id,
        originalStartAt: { gte: cutoff },
        isRecurrenceOverride: false,
      },
    });
    const nextSeries = await tx.recurrenceSeries.create({
      data: {
        calendarId: calendar.id,
        createdBy: series.createdBy,
        updatedBy: userId,
        title: dto.title ?? series.title,
        description:
          dto.description === undefined ? series.description : dto.description,
        location: dto.location === undefined ? series.location : dto.location,
        startAt: nextStartAt,
        endAt: nextEndAt,
        allDay: dto.allDay ?? series.allDay,
        color: dto.color === undefined ? series.color : dto.color,
        status: dto.status ?? series.status,
        visibility: dto.visibility ?? series.visibility,
        sourceType: series.sourceType,
        recurrenceRule: nextRule,
        timeZone: calendar.timeZone,
      },
    });
    await this.relations.createSeriesRelations(tx, nextSeries.id, {
      attendees: dto.attendees
        ? this.relations.normalizeAttendees(series.createdBy, dto.attendees)
        : series.attendees.map(({ userId, optional }) => ({
            userId,
            optional,
          })),
      reminders: dto.reminders
        ? this.relations.normalizeReminders(dto.reminders)
        : series.reminders.map(({ minutesBefore, method }) => ({
            minutesBefore,
            method,
          })),
      documentIds:
        dto.documentIds ?? series.documents.map((item) => item.documentId),
      exceptionDates: series.exceptions
        .filter((exception) => exception.occurrenceStart >= cutoff)
        .map((exception) =>
          new Date(
            exception.occurrenceStart.getTime() +
              nextStartAt.getTime() -
              cutoff.getTime(),
          ).toISOString(),
        ),
    });
    const overrides = await tx.calendarEvent.findMany({
      where: {
        recurrenceSeriesId: series.id,
        originalStartAt: { gte: cutoff },
        isRecurrenceOverride: true,
      },
      include: eventWithRelationsInclude,
    });
    for (const occurrence of overrides) {
      await this.updatePreservedOverride(
        tx,
        userId,
        occurrence,
        calendar,
        dto,
        nextSeries.id,
        nextStartAt.getTime() - cutoff.getTime(),
        event.id,
      );
    }
    await tx.recurrenceException.deleteMany({
      where: { seriesId: series.id, occurrenceStart: { gte: cutoff } },
    });
    await this.materializeSeries(nextSeries.id, nextStartAt, tx);
    if (event.isRecurrenceOverride) return event.id;
    return this.findFirstSeriesOccurrenceId(nextSeries.id, nextStartAt, tx);
  }

  private async updatePreservedOverride(
    tx: Prisma.TransactionClient,
    userId: string,
    occurrence: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    seriesId: string,
    startDelta: number,
    selectedOccurrenceId: string,
  ): Promise<void> {
    // Preserve the individual date/time and identity, including cancelled slots.
    const patch =
      occurrence.id === selectedOccurrenceId
        ? dto
        : { ...dto, startAt: undefined, endAt: undefined };
    const nextStartAt = patch.startAt
      ? new Date(patch.startAt)
      : occurrence.startAt;
    await tx.calendarEvent.update({
      where: { id: occurrence.id },
      data: {
        recurrenceSeriesId: seriesId,
        originalStartAt: new Date(
          (occurrence.originalStartAt ?? occurrence.startAt).getTime() +
            startDelta,
        ),
        calendarId: calendar.id,
        updatedBy: userId,
        title: patch.title,
        description: patch.description,
        location: patch.location,
        allDay: patch.allDay,
        color: patch.color,
        status: patch.status,
        visibility: patch.visibility,
        startAt: patch.startAt ? nextStartAt : undefined,
        endAt: patch.endAt ? new Date(patch.endAt) : undefined,
        cancelledAt: this.getCancelledAt(patch.status),
      },
    });
    await this.relations.replaceEventRelations(
      tx,
      occurrence,
      nextStartAt,
      patch,
    );
  }

  private async shiftSeriesExceptions(
    tx: Prisma.TransactionClient,
    seriesId: string,
    exceptions: RecurrenceException[],
    startDelta: number,
  ): Promise<void> {
    if (!startDelta || !exceptions.length) return;
    await tx.recurrenceException.deleteMany({ where: { seriesId } });
    await tx.recurrenceException.createMany({
      data: exceptions.map(({ occurrenceStart }) => ({
        seriesId,
        occurrenceStart: new Date(occurrenceStart.getTime() + startDelta),
      })),
      skipDuplicates: true,
    });
  }

  private getStandaloneEventData(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    startAt: Date,
    endAt: Date,
  ): Prisma.CalendarEventUncheckedCreateInput {
    return {
      calendarId: calendar.id,
      createdBy: event.createdBy,
      updatedBy: userId,
      title: dto.title ?? event.title,
      description:
        dto.description === undefined ? event.description : dto.description,
      location: dto.location === undefined ? event.location : dto.location,
      startAt,
      endAt,
      allDay: dto.allDay ?? event.allDay,
      color: dto.color === undefined ? event.color : dto.color,
      status: dto.status ?? event.status,
      visibility: dto.visibility ?? event.visibility,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      completedAt: event.completedAt,
      cancelledAt:
        dto.status === EventStatus.CANCELLED ? new Date() : event.cancelledAt,
    };
  }

  private async materializeSeries(
    seriesId: string,
    startAt: Date,
    tx?: Prisma.TransactionClient,
  ) {
    await this.recurrence.materializeSeriesThrough(
      seriesId,
      this.recurrence.getDefaultGenerationEnd(startAt),
      tx,
    );
  }

  private async findFirstSeriesOccurrenceId(
    seriesId: string,
    from?: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const occurrence = await (tx ?? this.prisma).calendarEvent.findFirst({
      where: {
        recurrenceSeriesId: seriesId,
        status: { not: EventStatus.CANCELLED },
        originalStartAt: from ? { gte: from } : undefined,
      },
      orderBy: { startAt: 'asc' },
      select: { id: true },
    });
    if (!occurrence) {
      if (from)
        return this.findFirstSeriesOccurrenceId(seriesId, undefined, tx);
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_RECURRENCE_RULE,
      );
    }
    return occurrence.id;
  }

  private async getSeriesOccurrenceIds(
    seriesId: string,
    tx: Prisma.TransactionClient,
    from?: Date,
  ): Promise<string[]> {
    const occurrences = await tx.calendarEvent.findMany({
      where: {
        recurrenceSeriesId: seriesId,
        originalStartAt: from ? { gte: from } : undefined,
      },
      select: { id: true },
    });
    return occurrences.map((occurrence) => occurrence.id);
  }

  private async cancelOccurrencesInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    eventIds: string[],
    isOverride: boolean,
  ): Promise<void> {
    if (eventIds.length === 0) return;
    await tx.calendarEvent.updateMany({
      where: { id: { in: eventIds } },
      data: {
        status: EventStatus.CANCELLED,
        updatedBy: userId,
        cancelledAt: new Date(),
        isRecurrenceOverride: isOverride ? true : undefined,
      },
    });
    await tx.reminder.updateMany({
      where: { eventId: { in: eventIds } },
      data: { deliveryStatus: ReminderDeliveryStatus.CANCELLED },
    });
  }

  private getCancelledAt(status?: EventStatus): Date | null | undefined {
    if (status === EventStatus.CANCELLED) return new Date();
    return status ? null : undefined;
  }

  private assertSeriesRange(startAt: Date, endAt: Date): void {
    if (endAt <= startAt) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_EVENT_RANGE,
      );
    }
  }
}
