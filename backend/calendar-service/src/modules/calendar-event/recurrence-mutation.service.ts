import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Calendar,
  EventSourceType,
  EventStatus,
  EventVisibility,
  Prisma,
  ReminderDeliveryStatus,
} from '@prisma/client';
import { CALENDAR_ERROR_MESSAGES } from '../../common/constants/calendar.constants';
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
    const series = await this.prisma.$transaction(async (tx) => {
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
      return created;
    });

    await this.materializeSeries(series.id, series.startAt);
    return this.findFirstSeriesOccurrenceId(series.id);
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

    const seriesId = await this.prisma.$transaction(async (tx) => {
      const series = await tx.recurrenceSeries.create({
        data: {
          calendarId: calendar.id,
          createdBy: event.createdBy,
          updatedBy: userId,
          title: dto.title ?? event.title,
          description:
            dto.description === undefined ? event.description : dto.description,
          location: dto.location === undefined ? event.location : dto.location,
          startAt,
          endAt: dto.endAt ? new Date(dto.endAt) : event.endAt,
          allDay: dto.allDay ?? event.allDay,
          color: dto.color === undefined ? event.color : dto.color,
          status: dto.status ?? event.status,
          visibility: dto.visibility ?? event.visibility,
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
      return series.id;
    });

    await this.materializeSeries(seriesId, startAt);
    return this.findFirstSeriesOccurrenceId(seriesId);
  }

  async updateRecurringEvent(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
  ): Promise<string> {
    if (dto.recurrenceRule === null) {
      return this.removeRecurrence(userId, event, calendar, dto);
    }
    const scope = dto.recurrenceScope ?? RecurrenceScope.THIS;
    if (scope === RecurrenceScope.THIS) {
      return this.updateSingleOccurrence(userId, event, calendar, dto);
    }
    if (scope === RecurrenceScope.THIS_AND_FOLLOWING) {
      return this.updateThisAndFollowing(userId, event, calendar, dto);
    }
    return this.updateEntireSeries(userId, event, calendar, dto);
  }

  async cancelEvent(
    userId: string,
    event: EventWithRelations,
    scope: RecurrenceScope,
  ): Promise<void> {
    if (!event.recurrenceSeries || scope === RecurrenceScope.THIS) {
      await this.cancelOccurrences(userId, [event.id], true);
      return;
    }

    const seriesId = event.recurrenceSeries.id;
    if (scope === RecurrenceScope.ALL) {
      const occurrenceIds = await this.getSeriesOccurrenceIds(seriesId);
      await this.prisma.$transaction(async (tx) => {
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
      });
      return;
    }

    const cutoff = event.originalStartAt ?? event.startAt;
    const occurrenceIds = await this.getSeriesOccurrenceIds(seriesId, cutoff);
    await this.prisma.$transaction(async (tx) => {
      await tx.recurrenceSeries.update({
        where: { id: seriesId },
        data: {
          recurrenceRule: this.recurrence.truncateBefore(
            event.recurrenceSeries!.recurrenceRule,
            cutoff,
            event.recurrenceSeries!.timeZone,
          ),
          recurrenceGeneratedUntil: new Date(cutoff.getTime() - 1),
          updatedBy: userId,
        },
      });
      await this.cancelOccurrencesInTransaction(
        tx,
        userId,
        occurrenceIds,
        false,
      );
    });
  }

  private async updateSingleOccurrence(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
  ): Promise<string> {
    const nextStartAt = dto.startAt ? new Date(dto.startAt) : event.startAt;
    const nextEndAt = dto.endAt ? new Date(dto.endAt) : event.endAt;
    await this.prisma.$transaction(async (tx) => {
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
    });
    return event.id;
  }

  private async removeRecurrence(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
  ): Promise<string> {
    const series = event.recurrenceSeries!;
    const scope = dto.recurrenceScope ?? RecurrenceScope.THIS;
    const cutoff = event.originalStartAt ?? event.startAt;
    const nextStartAt = dto.startAt ? new Date(dto.startAt) : event.startAt;
    const nextEndAt = dto.endAt ? new Date(dto.endAt) : event.endAt;

    if (scope === RecurrenceScope.ALL) {
      return this.prisma.$transaction(async (tx) => {
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
      });
    }

    await this.prisma.$transaction(async (tx) => {
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
    });
    return event.id;
  }

  private async updateEntireSeries(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
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
    const recurrenceChanged =
      dto.recurrenceRule !== undefined &&
      dto.recurrenceRule !== series.recurrenceRule;
    const timeChanged =
      (dto.startAt !== undefined &&
        new Date(dto.startAt).getTime() !== event.startAt.getTime()) ||
      (dto.endAt !== undefined &&
        new Date(dto.endAt).getTime() !== event.endAt.getTime());
    const regenerate = timeChanged || recurrenceChanged;

    await this.prisma.$transaction(async (tx) => {
      await tx.recurrenceSeries.update({
        where: { id: series.id },
        data: {
          calendarId: calendar.id,
          updatedBy: userId,
          title: dto.title,
          description: dto.description,
          location: dto.location,
          startAt: dto.startAt ? nextSeriesStart : undefined,
          endAt: dto.endAt ? nextSeriesEnd : undefined,
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
          where: { recurrenceSeriesId: series.id },
        });
        return;
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
            isRecurrenceOverride: false,
          },
        });
        await this.relations.replaceEventRelations(
          tx,
          occurrence,
          occurrence.startAt,
          dto,
        );
      }
    });

    if (regenerate) await this.materializeSeries(series.id, nextSeriesStart);
    return this.findFirstSeriesOccurrenceId(series.id);
  }

  private async updateThisAndFollowing(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
  ): Promise<string> {
    const series = event.recurrenceSeries!;
    const cutoff = event.originalStartAt ?? event.startAt;
    const nextStartAt = dto.startAt ? new Date(dto.startAt) : event.startAt;
    const nextEndAt = dto.endAt ? new Date(dto.endAt) : event.endAt;
    const nextRule =
      dto.recurrenceRule && dto.recurrenceRule !== series.recurrenceRule
        ? dto.recurrenceRule
        : this.recurrence.remainingRule(
            series.recurrenceRule,
            series.startAt,
            cutoff,
            series.timeZone,
          );

    const newSeriesId = await this.prisma.$transaction(async (tx) => {
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
        },
      });
      const nextSeries = await tx.recurrenceSeries.create({
        data: {
          calendarId: calendar.id,
          createdBy: series.createdBy,
          updatedBy: userId,
          title: dto.title ?? event.title,
          description:
            dto.description === undefined ? event.description : dto.description,
          location: dto.location === undefined ? event.location : dto.location,
          startAt: nextStartAt,
          endAt: nextEndAt,
          allDay: dto.allDay ?? event.allDay,
          color: dto.color === undefined ? event.color : dto.color,
          status: dto.status ?? event.status,
          visibility: dto.visibility ?? event.visibility,
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
          .map((exception) => exception.occurrenceStart.toISOString()),
      });
      await tx.recurrenceException.deleteMany({
        where: { seriesId: series.id, occurrenceStart: { gte: cutoff } },
      });
      return nextSeries.id;
    });

    await this.materializeSeries(newSeriesId, nextStartAt);
    return this.findFirstSeriesOccurrenceId(newSeriesId);
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
      sourceType: EventSourceType.USER,
      sourceId: null,
      cancelledAt:
        dto.status === EventStatus.CANCELLED ? new Date() : event.cancelledAt,
    };
  }

  private async materializeSeries(seriesId: string, startAt: Date) {
    await this.recurrence.materializeSeriesThrough(
      seriesId,
      this.recurrence.getDefaultGenerationEnd(startAt),
    );
  }

  private async findFirstSeriesOccurrenceId(seriesId: string): Promise<string> {
    const occurrence = await this.prisma.calendarEvent.findFirst({
      where: {
        recurrenceSeriesId: seriesId,
        status: { not: EventStatus.CANCELLED },
      },
      orderBy: { startAt: 'asc' },
      select: { id: true },
    });
    if (!occurrence) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_RECURRENCE_RULE,
      );
    }
    return occurrence.id;
  }

  private async getSeriesOccurrenceIds(
    seriesId: string,
    from?: Date,
  ): Promise<string[]> {
    const occurrences = await this.prisma.calendarEvent.findMany({
      where: {
        recurrenceSeriesId: seriesId,
        originalStartAt: from ? { gte: from } : undefined,
      },
      select: { id: true },
    });
    return occurrences.map((occurrence) => occurrence.id);
  }

  private async cancelOccurrences(
    userId: string,
    eventIds: string[],
    isOverride: boolean,
  ): Promise<void> {
    await this.prisma.$transaction((tx) =>
      this.cancelOccurrencesInTransaction(tx, userId, eventIds, isOverride),
    );
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
}
