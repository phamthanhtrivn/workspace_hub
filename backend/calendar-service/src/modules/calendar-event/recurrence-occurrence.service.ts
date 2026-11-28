import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Calendar,
  EventStatus,
  Prisma,
  ReminderDeliveryStatus,
  RecurrenceException,
} from '@prisma/client';
import { CALENDAR_ERROR_MESSAGES } from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { EventWithRelations } from './calendar-event.types';
import { CalendarRecurrenceService } from './calendar-recurrence.service';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { EventRelationService } from './event-relation.service';

@Injectable()
export class RecurrenceOccurrenceService {
  constructor(
    private readonly recurrence: CalendarRecurrenceService,
    private readonly relations: EventRelationService,
    private readonly prisma: PrismaService,
  ) {}
  async reuseRegularOccurrences(
    tx: Prisma.TransactionClient,
    userId: string,
    occurrences: EventWithRelations[],
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
    seriesId: string,
    seriesStart: Date,
    seriesEnd: Date,
    rule: string,
    startDelta: number,
    exceptionDates: string[],
  ) {
    const excluded = new Set(exceptionDates);
    for (const occurrence of occurrences) {
      const startAt = new Date(
        (occurrence.originalStartAt ?? occurrence.startAt).getTime() +
          startDelta,
      );
      if (
        excluded.has(startAt.toISOString()) ||
        !this.recurrence.includesOccurrence(
          rule,
          seriesStart,
          calendar.timeZone,
          startAt,
        )
      ) {
        await tx.calendarEvent.delete({ where: { id: occurrence.id } });
        continue;
      }
      await tx.calendarEvent.update({
        where: { id: occurrence.id },
        data: {
          recurrenceSeriesId: seriesId,
          originalStartAt: startAt,
          calendarId: calendar.id,
          updatedBy: userId,
          startAt,
          endAt: new Date(
            startAt.getTime() + seriesEnd.getTime() - seriesStart.getTime(),
          ),
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
      await this.relations.replaceEventRelations(tx, occurrence, startAt, dto);
    }
  }

  async updatePreservedOverride(
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
        conferenceEnabled: patch.conference?.enabled,
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

  async shiftSeriesExceptions(
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

  getStandaloneEventData(
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
      conferenceEnabled: dto.conference?.enabled ?? event.conferenceEnabled,
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

  async materializeSeries(
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

  async findFirstSeriesOccurrenceId(
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

  async getSeriesOccurrenceIds(
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

  async cancelOccurrencesInTransaction(
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

  getCancelledAt(status?: EventStatus): Date | null | undefined {
    if (status === EventStatus.CANCELLED) return new Date();
    return status ? null : undefined;
  }

  assertSeriesRange(startAt: Date, endAt: Date): void {
    if (endAt <= startAt) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_EVENT_RANGE,
      );
    }
  }
}
