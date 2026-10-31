import { Injectable } from '@nestjs/common';
import { Calendar, Prisma } from '@prisma/client';
import {
  EventWithRelations,
  eventWithRelationsInclude,
} from './calendar-event.types';
import { CalendarRecurrenceService } from './calendar-recurrence.service';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { EventRelationService } from './event-relation.service';
import { RecurrenceOccurrenceService } from './recurrence-occurrence.service';

@Injectable()
export class RecurrenceEntireMutationService {
  constructor(
    private readonly recurrence: CalendarRecurrenceService,
    private readonly relations: EventRelationService,
    private readonly occurrences: RecurrenceOccurrenceService,
  ) {}
  async updateEntireSeries(
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
    this.occurrences.assertSeriesRange(nextSeriesStart, nextSeriesEnd);
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
        conferenceEnabled: dto.conference?.enabled,
        startAt: dto.startAt ? nextSeriesStart : undefined,
        endAt: dto.endAt || dto.startAt ? nextSeriesEnd : undefined,
        allDay: dto.allDay,
        color: dto.color,
        status: dto.status,
        visibility: dto.visibility,
        recurrenceRule: dto.recurrenceRule ?? undefined,
        timeZone: calendar.timeZone,
        recurrenceGeneratedUntil: regenerate ? null : undefined,
        cancelledAt: this.occurrences.getCancelledAt(dto.status),
      },
    });
    await this.relations.replaceSeriesRelations(
      tx,
      series.id,
      event.createdBy,
      dto,
    );

    if (regenerate) {
      const regular = await tx.calendarEvent.findMany({
        where: { recurrenceSeriesId: series.id, isRecurrenceOverride: false },
        include: eventWithRelationsInclude,
      });
      const overrides = await tx.calendarEvent.findMany({
        where: {
          recurrenceSeriesId: series.id,
          isRecurrenceOverride: true,
        },
        include: eventWithRelationsInclude,
        orderBy: { originalStartAt: startDelta > 0 ? 'desc' : 'asc' },
      });
      await tx.calendarEvent.updateMany({
        where: { recurrenceSeriesId: series.id },
        data: { originalStartAt: null },
      });
      const exceptionDates =
        dto.exceptionDates ??
        series.exceptions.map((exception) =>
          new Date(
            exception.occurrenceStart.getTime() + startDelta,
          ).toISOString(),
        );
      await this.occurrences.reuseRegularOccurrences(
        tx,
        userId,
        regular.filter((occurrence) => !occurrence.isRecurrenceOverride),
        calendar,
        dto,
        series.id,
        nextSeriesStart,
        nextSeriesEnd,
        dto.recurrenceRule ?? series.recurrenceRule,
        startDelta,
        exceptionDates,
      );
      selectedOverridePreserved = overrides.some(({ id }) => id === event.id);
      for (const occurrence of overrides) {
        await this.occurrences.updatePreservedOverride(
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
        await this.occurrences.shiftSeriesExceptions(
          tx,
          series.id,
          series.exceptions,
          startDelta,
        );
      }
      await this.occurrences.materializeSeries(series.id, nextSeriesStart, tx);
      if (selectedOverridePreserved) return event.id;
      return this.occurrences.findFirstSeriesOccurrenceId(
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
          conferenceEnabled: dto.conference?.enabled,
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
}
