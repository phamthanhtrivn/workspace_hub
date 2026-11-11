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
export class RecurrenceFollowingMutationService {
  constructor(
    private readonly recurrence: CalendarRecurrenceService,
    private readonly relations: EventRelationService,
    private readonly occurrences: RecurrenceOccurrenceService,
  ) {}
  async updateThisAndFollowing(
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

    this.occurrences.assertSeriesRange(nextStartAt, nextEndAt);
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
    const regular = await tx.calendarEvent.findMany({
      where: {
        recurrenceSeriesId: series.id,
        originalStartAt: { gte: cutoff },
        isRecurrenceOverride: false,
      },
      include: eventWithRelationsInclude,
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
        conferenceEnabled: dto.conference?.enabled ?? series.conferenceEnabled,
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
    await this.occurrences.reuseRegularOccurrences(
      tx,
      userId,
      regular.filter((occurrence) => !occurrence.isRecurrenceOverride),
      calendar,
      dto,
      nextSeries.id,
      nextStartAt,
      nextEndAt,
      nextRule,
      startDelta,
      series.exceptions
        .filter((exception) => exception.occurrenceStart >= cutoff)
        .map((exception) =>
          new Date(
            exception.occurrenceStart.getTime() + startDelta,
          ).toISOString(),
        ),
    );
    for (const occurrence of overrides) {
      await this.occurrences.updatePreservedOverride(
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
    await this.occurrences.materializeSeries(nextSeries.id, nextStartAt, tx);
    if (event.isRecurrenceOverride) return event.id;
    return this.occurrences.findFirstSeriesOccurrenceId(
      nextSeries.id,
      nextStartAt,
      tx,
    );
  }
}
