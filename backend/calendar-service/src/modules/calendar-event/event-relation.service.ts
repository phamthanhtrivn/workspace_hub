import { BadRequestException, Injectable } from '@nestjs/common';
import { AttendeeResponseStatus, Prisma } from '@prisma/client';
import { CalendarEventAttendeeDto } from './dto/calendar-event-attendee.dto';
import { CalendarEventReminderDto } from './dto/calendar-event-reminder.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { EventWithRelations } from './calendar-event.types';
import { CALENDAR_ERROR_MESSAGES } from '../../common/constants/calendar.constants';
import { reminderSchedule } from './reminder-schedule';

export type SeriesRelationInputs = {
  attendees: CalendarEventAttendeeDto[];
  reminders: CalendarEventReminderDto[];
  documentIds: string[];
  exceptionDates: string[];
};

type EventRelationInputs = Omit<SeriesRelationInputs, 'exceptionDates'>;

@Injectable()
export class EventRelationService {
  async createEventRelations(
    tx: Prisma.TransactionClient,
    eventId: string,
    creatorUserId: string,
    startAt: Date,
    inputs: EventRelationInputs,
  ): Promise<void> {
    await this.createDocuments(tx, eventId, inputs.documentIds);
    await this.createAttendees(tx, eventId, creatorUserId, inputs.attendees);
    await this.createReminders(tx, eventId, startAt, inputs.reminders);
  }

  async copyOccurrenceRelations(
    tx: Prisma.TransactionClient,
    eventId: string,
    event: EventWithRelations,
    dto: UpdateCalendarEventDto,
    startAt: Date,
  ): Promise<void> {
    await this.createEventRelations(tx, eventId, event.createdBy, startAt, {
      documentIds:
        dto.documentIds ?? event.documents.map((item) => item.documentId),
      attendees: dto.attendees
        ? this.normalizeAttendees(event.createdBy, dto.attendees)
        : event.attendees.map((attendee) => ({
            userId: attendee.userId,
            optional: attendee.optional,
          })),
      reminders: dto.reminders
        ? this.normalizeReminders(dto.reminders)
        : event.reminders.map((reminder) => ({
            minutesBefore: reminder.minutesBefore,
            method: reminder.method,
          })),
    });
  }

  async createSeriesRelations(
    tx: Prisma.TransactionClient,
    seriesId: string,
    inputs: SeriesRelationInputs,
  ): Promise<void> {
    await this.createSeriesAttendees(tx, seriesId, inputs.attendees);
    await this.createSeriesReminders(tx, seriesId, inputs.reminders);
    await this.createSeriesDocuments(tx, seriesId, inputs.documentIds);
    await this.createSeriesExceptions(tx, seriesId, inputs.exceptionDates);
  }

  async replaceSeriesRelations(
    tx: Prisma.TransactionClient,
    seriesId: string,
    creatorUserId: string,
    dto: UpdateCalendarEventDto,
  ): Promise<void> {
    if (dto.attendees !== undefined) {
      await tx.recurrenceSeriesAttendee.deleteMany({ where: { seriesId } });
      await this.createSeriesAttendees(
        tx,
        seriesId,
        this.normalizeAttendees(creatorUserId, dto.attendees),
      );
    }
    if (dto.reminders !== undefined) {
      await tx.recurrenceSeriesReminder.deleteMany({ where: { seriesId } });
      await this.createSeriesReminders(
        tx,
        seriesId,
        this.normalizeReminders(dto.reminders),
      );
    }
    if (dto.documentIds !== undefined) {
      await tx.recurrenceSeriesDocument.deleteMany({ where: { seriesId } });
      await this.createSeriesDocuments(tx, seriesId, dto.documentIds);
    }
    if (dto.exceptionDates !== undefined) {
      await tx.recurrenceException.deleteMany({ where: { seriesId } });
      await this.createSeriesExceptions(tx, seriesId, dto.exceptionDates);
    }
  }

  async replaceEventRelations(
    tx: Prisma.TransactionClient,
    target: EventWithRelations,
    nextStartAt: Date,
    dto: UpdateCalendarEventDto,
  ): Promise<void> {
    await this.replaceDocuments(tx, target.id, dto.documentIds);
    await this.replaceAttendees(tx, target, dto.attendees);
    await this.replaceReminders(tx, target, nextStartAt, dto.reminders);
  }

  normalizeAttendees(
    creatorUserId: string,
    attendees: CalendarEventAttendeeDto[] = [],
  ): CalendarEventAttendeeDto[] {
    const byUserId = new Map<string, CalendarEventAttendeeDto>();
    byUserId.set(creatorUserId, { userId: creatorUserId, optional: false });
    attendees.forEach((attendee) => byUserId.set(attendee.userId, attendee));
    return [...byUserId.values()];
  }

  normalizeReminders(
    reminders: CalendarEventReminderDto[] = [],
  ): CalendarEventReminderDto[] {
    const seen = new Set<string>();
    for (const reminder of reminders) {
      const key = `${reminder.method}:${reminder.minutesBefore}`;
      if (seen.has(key))
        throw new BadRequestException(
          CALENDAR_ERROR_MESSAGES.DUPLICATE_REMINDER,
        );
      seen.add(key);
    }

    return reminders;
  }

  private async createDocuments(
    tx: Prisma.TransactionClient,
    eventId: string,
    documentIds: string[],
  ): Promise<void> {
    if (documentIds.length === 0) return;
    await tx.calendarEventDocument.createMany({
      data: [...new Set(documentIds)].map((documentId) => ({
        eventId,
        documentId,
      })),
    });
  }

  private async createAttendees(
    tx: Prisma.TransactionClient,
    eventId: string,
    creatorUserId: string,
    attendees: CalendarEventAttendeeDto[],
  ): Promise<void> {
    if (attendees.length === 0) return;
    await tx.calendarEventAttendee.createMany({
      data: attendees.map((attendee) => ({
        eventId,
        userId: attendee.userId,
        optional: attendee.optional ?? false,
        responseStatus:
          attendee.userId === creatorUserId
            ? AttendeeResponseStatus.ACCEPTED
            : AttendeeResponseStatus.NEEDS_ACTION,
      })),
      skipDuplicates: true,
    });
  }

  private async createReminders(
    tx: Prisma.TransactionClient,
    eventId: string,
    startAt: Date,
    reminders: CalendarEventReminderDto[],
  ): Promise<void> {
    if (reminders.length === 0) return;
    await tx.reminder.createMany({
      data: reminders.map((reminder) => ({
        eventId,
        minutesBefore: reminder.minutesBefore,
        method: reminder.method,
        ...reminderSchedule(startAt, reminder.minutesBefore),
      })),
    });
  }

  private async createSeriesAttendees(
    tx: Prisma.TransactionClient,
    seriesId: string,
    attendees: CalendarEventAttendeeDto[],
  ): Promise<void> {
    if (attendees.length === 0) return;
    await tx.recurrenceSeriesAttendee.createMany({
      data: attendees.map((attendee) => ({
        seriesId,
        userId: attendee.userId,
        optional: attendee.optional ?? false,
      })),
      skipDuplicates: true,
    });
  }

  private async createSeriesReminders(
    tx: Prisma.TransactionClient,
    seriesId: string,
    reminders: CalendarEventReminderDto[],
  ): Promise<void> {
    if (reminders.length === 0) return;
    await tx.recurrenceSeriesReminder.createMany({
      data: reminders.map((reminder) => ({
        seriesId,
        minutesBefore: reminder.minutesBefore,
        method: reminder.method,
      })),
      skipDuplicates: true,
    });
  }

  private async createSeriesDocuments(
    tx: Prisma.TransactionClient,
    seriesId: string,
    documentIds: string[],
  ): Promise<void> {
    if (documentIds.length === 0) return;
    await tx.recurrenceSeriesDocument.createMany({
      data: [...new Set(documentIds)].map((documentId) => ({
        seriesId,
        documentId,
      })),
      skipDuplicates: true,
    });
  }

  private async createSeriesExceptions(
    tx: Prisma.TransactionClient,
    seriesId: string,
    exceptionDates: string[],
  ): Promise<void> {
    if (exceptionDates.length === 0) return;
    await tx.recurrenceException.createMany({
      data: [...new Set(exceptionDates)].map((occurrenceStart) => ({
        seriesId,
        occurrenceStart: new Date(occurrenceStart),
      })),
      skipDuplicates: true,
    });
  }

  private async replaceDocuments(
    tx: Prisma.TransactionClient,
    eventId: string,
    documentIds?: string[],
  ): Promise<void> {
    if (documentIds === undefined) return;
    await tx.calendarEventDocument.deleteMany({ where: { eventId } });
    await this.createDocuments(tx, eventId, documentIds);
  }

  private async replaceAttendees(
    tx: Prisma.TransactionClient,
    target: EventWithRelations,
    attendees?: CalendarEventAttendeeDto[],
  ): Promise<void> {
    if (attendees === undefined) return;
    const existing = await tx.calendarEventAttendee.findMany({
      where: { eventId: target.id },
    });
    const existingStatusMap = new Map(
      existing.map((a) => [a.userId, a.responseStatus]),
    );

    await tx.calendarEventAttendee.deleteMany({
      where: { eventId: target.id },
    });

    const normalized = this.normalizeAttendees(target.createdBy, attendees);
    if (normalized.length === 0) return;

    await tx.calendarEventAttendee.createMany({
      data: normalized.map((attendee) => {
        const prevStatus = existingStatusMap.get(attendee.userId);
        const defaultStatus =
          attendee.userId === target.createdBy
            ? AttendeeResponseStatus.ACCEPTED
            : AttendeeResponseStatus.NEEDS_ACTION;
        return {
          eventId: target.id,
          userId: attendee.userId,
          optional: attendee.optional ?? false,
          responseStatus: prevStatus ?? defaultStatus,
        };
      }),
      skipDuplicates: true,
    });
  }

  private async replaceReminders(
    tx: Prisma.TransactionClient,
    target: EventWithRelations,
    nextStartAt: Date,
    reminders?: CalendarEventReminderDto[],
  ): Promise<void> {
    const changedStart = nextStartAt.getTime() !== target.startAt.getTime();
    if (reminders === undefined && !changedStart) return;
    const current = await tx.reminder.findMany({
      where: { eventId: target.id },
    });
    const requested = this.normalizeReminders(
      reminders ??
        current.map(({ method, minutesBefore }) => ({ method, minutesBefore })),
    );
    const keyOf = (reminder: CalendarEventReminderDto) =>
      `${reminder.method}:${reminder.minutesBefore}`;
    const requestedKeys = new Set(requested.map(keyOf));
    const removedIds = current
      .filter((reminder) => !requestedKeys.has(keyOf(reminder)))
      .map((reminder) => reminder.id);
    if (removedIds.length)
      await tx.reminder.deleteMany({
        where: { eventId: target.id, id: { in: removedIds } },
      });
    const existingKeys = new Set(current.map(keyOf));
    await this.createReminders(
      tx,
      target.id,
      nextStartAt,
      requested.filter((reminder) => !existingKeys.has(keyOf(reminder))),
    );
    if (!changedStart) return;
    for (const reminder of current.filter((reminder) =>
      requestedKeys.has(keyOf(reminder)),
    )) {
      await tx.reminder.update({
        where: { id: reminder.id },
        data: {
          ...reminderSchedule(nextStartAt, reminder.minutesBefore),
          attemptCount: 0,
          nextAttemptAt: null,
          dispatchedAt: null,
          lastError: null,
        },
      });
    }
  }
}
