import { Injectable } from '@nestjs/common';
import { Calendar, Prisma } from '@prisma/client';
import { RecurrenceScope } from '../../common/enums/calendar.enum';
import { EventWithRelations } from './calendar-event.types';
import { CalendarRecurrenceService } from './calendar-recurrence.service';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { EventRelationService } from './event-relation.service';
import { RecurrenceOccurrenceService } from './recurrence-occurrence.service';

@Injectable()
export class RecurrenceSingleMutationService {
  constructor(
    private readonly relations: EventRelationService,
    private readonly recurrence: CalendarRecurrenceService,
    private readonly occurrences: RecurrenceOccurrenceService,
  ) {}
  async updateSingleOccurrence(
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
        conferenceEnabled: dto.conference?.enabled,
        startAt: dto.startAt ? nextStartAt : undefined,
        endAt: dto.endAt ? nextEndAt : undefined,
        allDay: dto.allDay,
        color: dto.color,
        status: dto.status,
        visibility: dto.visibility,
        isRecurrenceOverride: true,
        cancelledAt: this.occurrences.getCancelledAt(dto.status),
      },
    });
    await this.relations.replaceEventRelations(tx, event, nextStartAt, dto);
    return event.id;
  }

  async removeRecurrence(
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
      const standalone = await tx.calendarEvent.update({
        where: { id: event.id },
        data: {
          ...this.occurrences.getStandaloneEventData(
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
        ...this.occurrences.getStandaloneEventData(
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
}
