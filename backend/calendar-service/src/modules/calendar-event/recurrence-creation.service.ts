import { MutationEffect } from './recurrence-mutation.types';
import { Injectable } from '@nestjs/common';
import {
  Calendar,
  EventSourceType,
  EventStatus,
  EventVisibility,
} from '@prisma/client';
import { CALENDAR_DEFAULTS } from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { EventWithRelations } from './calendar-event.types';
import { CalendarRecurrenceService } from './calendar-recurrence.service';
import { CalendarEventAttendeeDto } from './dto/calendar-event-attendee.dto';
import { CalendarEventReminderDto } from './dto/calendar-event-reminder.dto';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { EventRelationService } from './event-relation.service';
import { RecurrenceOccurrenceService } from './recurrence-occurrence.service';

@Injectable()
export class RecurrenceCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly relations: EventRelationService,
    private readonly recurrence: CalendarRecurrenceService,
    private readonly occurrences: RecurrenceOccurrenceService,
  ) {}
  async createRecurringEvent(
    userId: string,
    calendar: Calendar,
    dto: CreateCalendarEventDto,
    attendees: CalendarEventAttendeeDto[],
    reminders: CalendarEventReminderDto[],
    afterMutation?: MutationEffect,
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
            conferenceEnabled: dto.conference?.enabled ?? false,
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
        await this.occurrences.materializeSeries(
          created.id,
          created.startAt,
          tx,
        );
        const firstId = await this.occurrences.findFirstSeriesOccurrenceId(
          created.id,
          undefined,
          tx,
        );
        await afterMutation?.(tx, firstId);
        return firstId;
      },
      { timeout: CALENDAR_DEFAULTS.RECURRENCE_TRANSACTION_TIMEOUT_MS },
    );
  }

  async convertStandaloneToSeries(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    afterMutation?: MutationEffect,
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
            conferenceEnabled:
              dto.conference?.enabled ?? event.conferenceEnabled,
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
        if (
          this.recurrence.includesOccurrence(
            dto.recurrenceRule!,
            startAt,
            calendar.timeZone,
            startAt,
          ) &&
          !dto.exceptionDates?.includes(startAt.toISOString())
        ) {
          await tx.calendarEvent.update({
            where: { id: event.id },
            data: {
              ...this.occurrences.getStandaloneEventData(
                userId,
                event,
                calendar,
                dto,
                startAt,
                dto.endAt ? new Date(dto.endAt) : event.endAt,
              ),
              recurrenceSeriesId: series.id,
              originalStartAt: startAt,
              isRecurrenceOverride: false,
            },
          });
          await this.relations.replaceEventRelations(tx, event, startAt, dto);
        } else await tx.calendarEvent.delete({ where: { id: event.id } });
        await this.occurrences.materializeSeries(series.id, startAt, tx);
        const firstId = await this.occurrences.findFirstSeriesOccurrenceId(
          series.id,
          undefined,
          tx,
        );
        await afterMutation?.(tx, firstId);
        return firstId;
      },
      { timeout: CALENDAR_DEFAULTS.RECURRENCE_TRANSACTION_TIMEOUT_MS },
    );
  }
}
