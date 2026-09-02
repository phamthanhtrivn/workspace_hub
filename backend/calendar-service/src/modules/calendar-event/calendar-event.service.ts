import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendeeResponseStatus,
  Calendar,
  EventSourceType,
  EventStatus,
  EventVisibility,
  Prisma,
  ReminderDeliveryStatus,
} from '@prisma/client';
import {
  CALENDAR_DEFAULTS,
  CALENDAR_ERROR_MESSAGES,
} from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { CalendarEventAttendeeDto } from './dto/calendar-event-attendee.dto';
import { CalendarEventReminderDto } from './dto/calendar-event-reminder.dto';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { CalendarRecurrenceService } from './calendar-recurrence.service';
import { ResourceAccessService } from '../../infrastructure/integrations/resource-access.service';
import { GetCalendarEventsQueryDto } from './dto/get-calendar-events-query.dto';
import { RecurrenceScope } from '../../common/enums/calendar.enum';

const eventWithRelationsInclude = {
  calendar: true,
  attendees: { orderBy: { createdAt: 'asc' as const } },
  reminders: { orderBy: { minutesBefore: 'asc' as const } },
  documents: { orderBy: { createdAt: 'asc' as const } },
  recurrenceSeries: {
    include: {
      exceptions: { orderBy: { occurrenceStart: 'asc' as const } },
      attendees: true,
      reminders: true,
      documents: true,
    },
  },
} satisfies Prisma.CalendarEventInclude;

type EventWithRelations = Prisma.CalendarEventGetPayload<{
  include: typeof eventWithRelationsInclude;
}>;

type SeriesRelationInputs = {
  attendees: CalendarEventAttendeeDto[];
  reminders: CalendarEventReminderDto[];
  documentIds: string[];
  exceptionDates: string[];
};

@Injectable()
export class CalendarEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly recurrenceService: CalendarRecurrenceService,
    private readonly resourceAccess: ResourceAccessService,
  ) {}

  async createEvent(
    userId: string,
    userEmail: string | undefined,
    dto: CreateCalendarEventDto,
  ) {
    const calendar = await this.assertCalendarOwner(userId, dto.calendarId);
    await this.resourceAccess.assertProjectAccess(userId, calendar.projectId);
    this.assertValidRange(dto.startAt, dto.endAt);
    this.recurrenceService.assertValidRule(dto.recurrenceRule);
    await this.resourceAccess.assertDocumentAccess(
      userId,
      userEmail,
      dto.documentIds,
    );

    const attendeeInputs = this.normalizeAttendees(userId, dto.attendees);
    const reminderInputs = this.normalizeReminders(dto.reminders);

    if (dto.recurrenceRule) {
      return this.createRecurringEvent(
        userId,
        calendar,
        dto,
        attendeeInputs,
        reminderInputs,
      );
    }

    const event = await this.prisma.$transaction(async (tx) => {
      const createdEvent = await tx.calendarEvent.create({
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
          visibility: dto.visibility,
        },
      });

      if (dto.documentIds?.length) {
        await tx.calendarEventDocument.createMany({
          data: [...new Set(dto.documentIds)].map((documentId) => ({
            eventId: createdEvent.id,
            documentId,
          })),
        });
      }

      await tx.calendarEventAttendee.createMany({
        data: attendeeInputs.map((attendee) => ({
          eventId: createdEvent.id,
          userId: attendee.userId,
          optional: attendee.optional ?? false,
          responseStatus:
            attendee.userId === userId
              ? AttendeeResponseStatus.ACCEPTED
              : AttendeeResponseStatus.NEEDS_ACTION,
        })),
        skipDuplicates: true,
      });

      if (reminderInputs.length > 0) {
        await tx.reminder.createMany({
          data: reminderInputs.map((reminder) => ({
            eventId: createdEvent.id,
            minutesBefore: reminder.minutesBefore,
            method: reminder.method,
            scheduledAt: this.getReminderScheduledAt(
              new Date(dto.startAt),
              reminder.minutesBefore,
            ),
          })),
        });
      }

      return createdEvent;
    });

    return this.getEventById(userId, event.id);
  }

  async getEvents(userId: string, filters: GetCalendarEventsQueryDto) {
    this.assertValidQueryRange(filters.startAt, filters.endAt);
    await this.resourceAccess.assertProjectAccess(userId, filters.projectId);

    const where: Prisma.CalendarEventWhereInput = {
      status: { not: EventStatus.CANCELLED },
      OR: [
        { calendar: { ownerUserId: userId } },
        { attendees: { some: { userId } } },
        { visibility: EventVisibility.PUBLIC },
      ],
    };

    const additionalFilters: Prisma.CalendarEventWhereInput[] = [];
    if (filters.startAt || filters.endAt) {
      additionalFilters.push(
        filters.endAt ? { startAt: { lte: new Date(filters.endAt) } } : {},
        filters.startAt ? { endAt: { gte: new Date(filters.startAt) } } : {},
      );
    }

    if (filters.calendarId) {
      where.calendarId = filters.calendarId;
    }

    if (filters.projectId) {
      additionalFilters.push({ calendar: { projectId: filters.projectId } });
    }

    if (additionalFilters.length > 0) {
      where.AND = additionalFilters;
    }

    const skip = (filters.page - 1) * filters.limit;
    const [events, total] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where,
        include: this.eventInclude(),
        orderBy: { startAt: 'asc' },
        skip,
        take: filters.limit,
      }),
      this.prisma.calendarEvent.count({ where }),
    ]);

    const enrichedEvents =
      await this.userProfileSnapshotService.attachProfilesToEvents(events);

    return {
      items: enrichedEvents.map((event) =>
        this.attachPermissions(userId, event),
      ),
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async getEventById(userId: string, eventId: string) {
    const event = await this.findEventOrThrow(eventId);
    this.assertCanViewEvent(userId, event);

    const [enrichedEvent] =
      await this.userProfileSnapshotService.attachProfilesToEvents([event]);
    return this.attachPermissions(userId, enrichedEvent);
  }

  async updateEvent(
    userId: string,
    userEmail: string | undefined,
    eventId: string,
    dto: UpdateCalendarEventDto,
  ) {
    const event = await this.findEventOrThrow(eventId);
    this.assertCanManageEvent(userId, event);
    this.assertUserManagedEvent(event);
    this.recurrenceService.assertValidRule(dto.recurrenceRule);
    await this.resourceAccess.assertDocumentAccess(
      userId,
      userEmail,
      dto.documentIds,
    );

    const targetCalendar = dto.calendarId
      ? await this.assertCalendarOwner(userId, dto.calendarId)
      : event.calendar;
    await this.resourceAccess.assertProjectAccess(
      userId,
      targetCalendar.projectId,
    );

    const startAt = dto.startAt ?? event.startAt.toISOString();
    const endAt = dto.endAt ?? event.endAt.toISOString();
    this.assertValidRange(startAt, endAt);

    if (!event.recurrenceSeries) {
      if (dto.recurrenceRule) {
        return this.convertStandaloneToSeries(
          userId,
          event,
          targetCalendar,
          dto,
        );
      }
      return this.updateStandaloneEvent(userId, event, targetCalendar, dto);
    }

    if (dto.recurrenceRule === null) {
      return this.removeRecurrence(userId, event, targetCalendar, dto);
    }

    const scope = dto.recurrenceScope ?? RecurrenceScope.THIS;
    if (scope === RecurrenceScope.THIS) {
      return this.updateSingleOccurrence(userId, event, targetCalendar, dto);
    }
    if (scope === RecurrenceScope.THIS_AND_FOLLOWING) {
      return this.updateThisAndFollowing(userId, event, targetCalendar, dto);
    }
    return this.updateEntireSeries(userId, event, targetCalendar, dto);
  }

  private async createRecurringEvent(
    userId: string,
    calendar: Calendar,
    dto: CreateCalendarEventDto,
    attendees: CalendarEventAttendeeDto[],
    reminders: CalendarEventReminderDto[],
  ) {
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
      await this.createSeriesRelations(tx, created.id, {
        attendees,
        reminders,
        documentIds: dto.documentIds ?? [],
        exceptionDates: dto.exceptionDates ?? [],
      });
      return created;
    });

    await this.recurrenceService.materializeSeriesThrough(
      series.id,
      this.recurrenceService.getDefaultGenerationEnd(series.startAt),
    );
    return this.getFirstSeriesOccurrence(userId, series.id);
  }

  private async convertStandaloneToSeries(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
  ) {
    const attendees = dto.attendees
      ? this.normalizeAttendees(userId, dto.attendees)
      : event.attendees.map((attendee) => ({
          userId: attendee.userId,
          optional: attendee.optional,
        }));
    const reminders = dto.reminders
      ? this.normalizeReminders(dto.reminders)
      : event.reminders.map((reminder) => ({
          minutesBefore: reminder.minutesBefore,
          method: reminder.method,
        }));
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
          startAt: dto.startAt ? new Date(dto.startAt) : event.startAt,
          endAt: dto.endAt ? new Date(dto.endAt) : event.endAt,
          allDay: dto.allDay ?? event.allDay,
          color: dto.color === undefined ? event.color : dto.color,
          status: dto.status ?? event.status,
          visibility: dto.visibility ?? event.visibility,
          recurrenceRule: dto.recurrenceRule!,
          timeZone: calendar.timeZone,
        },
      });
      await this.createSeriesRelations(tx, series.id, {
        attendees,
        reminders,
        documentIds:
          dto.documentIds ?? event.documents.map((item) => item.documentId),
        exceptionDates: dto.exceptionDates ?? [],
      });
      await tx.calendarEvent.delete({ where: { id: event.id } });
      return series.id;
    });

    await this.recurrenceService.materializeSeriesThrough(
      seriesId,
      this.recurrenceService.getDefaultGenerationEnd(
        dto.startAt ? new Date(dto.startAt) : event.startAt,
      ),
    );
    return this.getFirstSeriesOccurrence(userId, seriesId);
  }

  private async updateStandaloneEvent(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
  ) {
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
          cancelledAt:
            dto.status === EventStatus.CANCELLED
              ? new Date()
              : dto.status
                ? null
                : undefined,
        },
      });
      await this.replaceEventRelations(tx, event, nextStartAt, dto);
    });
    return this.getEventById(userId, event.id);
  }

  private async updateSingleOccurrence(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
  ) {
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
          cancelledAt:
            dto.status === EventStatus.CANCELLED
              ? new Date()
              : dto.status
                ? null
                : undefined,
        },
      });
      await this.replaceEventRelations(tx, event, nextStartAt, dto);
    });
    return this.getEventById(userId, event.id);
  }

  private async removeRecurrence(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
  ) {
    const series = event.recurrenceSeries!;
    const scope = dto.recurrenceScope ?? RecurrenceScope.THIS;
    const cutoff = event.originalStartAt ?? event.startAt;
    const nextStartAt = dto.startAt ? new Date(dto.startAt) : event.startAt;
    const nextEndAt = dto.endAt ? new Date(dto.endAt) : event.endAt;

    if (scope === RecurrenceScope.ALL) {
      const standaloneId = await this.prisma.$transaction(async (tx) => {
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
        await this.copyOccurrenceRelations(
          tx,
          standalone.id,
          event,
          dto,
          nextStartAt,
        );
        await tx.recurrenceSeries.delete({ where: { id: series.id } });
        return standalone.id;
      });
      return this.getEventById(userId, standaloneId);
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
            recurrenceRule: this.recurrenceService.truncateBefore(
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
      await this.replaceEventRelations(tx, event, nextStartAt, dto);
    });
    return this.getEventById(userId, event.id);
  }

  private async updateEntireSeries(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
  ) {
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
    const regenerate = Boolean(timeChanged || recurrenceChanged);

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
          cancelledAt:
            dto.status === EventStatus.CANCELLED
              ? new Date()
              : dto.status
                ? null
                : undefined,
        },
      });
      await this.replaceSeriesRelations(tx, series.id, event.createdBy, dto);

      if (regenerate) {
        await tx.calendarEvent.deleteMany({
          where: { recurrenceSeriesId: series.id },
        });
      } else {
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
          await this.replaceEventRelations(
            tx,
            occurrence,
            occurrence.startAt,
            dto,
          );
        }
      }
    });

    if (regenerate) {
      await this.recurrenceService.materializeSeriesThrough(
        series.id,
        this.recurrenceService.getDefaultGenerationEnd(nextSeriesStart),
      );
    }
    return this.getFirstSeriesOccurrence(userId, series.id);
  }

  private async updateThisAndFollowing(
    userId: string,
    event: EventWithRelations,
    calendar: Calendar,
    dto: UpdateCalendarEventDto,
  ) {
    const series = event.recurrenceSeries!;
    const cutoff = event.originalStartAt ?? event.startAt;
    const nextStartAt = dto.startAt ? new Date(dto.startAt) : event.startAt;
    const nextEndAt = dto.endAt ? new Date(dto.endAt) : event.endAt;
    const nextRule =
      dto.recurrenceRule && dto.recurrenceRule !== series.recurrenceRule
        ? dto.recurrenceRule
        : this.recurrenceService.remainingRule(
            series.recurrenceRule,
            series.startAt,
            cutoff,
            series.timeZone,
          );

    const newSeriesId = await this.prisma.$transaction(async (tx) => {
      await tx.recurrenceSeries.update({
        where: { id: series.id },
        data: {
          recurrenceRule: this.recurrenceService.truncateBefore(
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

      await this.createSeriesRelations(tx, nextSeries.id, {
        attendees: dto.attendees
          ? this.normalizeAttendees(series.createdBy, dto.attendees)
          : series.attendees.map((attendee) => ({
              userId: attendee.userId,
              optional: attendee.optional,
            })),
        reminders: dto.reminders
          ? this.normalizeReminders(dto.reminders)
          : series.reminders.map((reminder) => ({
              minutesBefore: reminder.minutesBefore,
              method: reminder.method,
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

    await this.recurrenceService.materializeSeriesThrough(
      newSeriesId,
      this.recurrenceService.getDefaultGenerationEnd(nextStartAt),
    );
    return this.getFirstSeriesOccurrence(userId, newSeriesId);
  }

  async cancelEvent(
    userId: string,
    eventId: string,
    scope: RecurrenceScope = RecurrenceScope.THIS,
  ): Promise<void> {
    const event = await this.findEventOrThrow(eventId);
    this.assertCanManageEvent(userId, event);
    this.assertUserManagedEvent(event);

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
          recurrenceRule: this.recurrenceService.truncateBefore(
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
  async updateResponse(
    userId: string,
    eventId: string,
    responseStatus: AttendeeResponseStatus,
  ) {
    const event = await this.findEventOrThrow(eventId);
    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Cannot respond to a cancelled event');
    }

    const attendee = await this.prisma.calendarEventAttendee.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (!attendee) {
      throw new ForbiddenException(CALENDAR_ERROR_MESSAGES.FORBIDDEN_RESPONSE);
    }

    const updated = await this.prisma.calendarEventAttendee.update({
      where: { id: attendee.id },
      data: { responseStatus },
    });

    return updated;
  }

  private async assertCalendarOwner(
    userId: string,
    calendarId: string,
  ): Promise<Calendar> {
    const calendar = await this.prisma.calendar.findUnique({
      where: { id: calendarId },
    });

    if (!calendar) {
      throw new NotFoundException(CALENDAR_ERROR_MESSAGES.CALENDAR_NOT_FOUND);
    }

    if (calendar.ownerUserId !== userId) {
      throw new ForbiddenException(CALENDAR_ERROR_MESSAGES.FORBIDDEN_CALENDAR);
    }

    return calendar;
  }

  private async findEventOrThrow(eventId: string): Promise<EventWithRelations> {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: this.eventInclude(),
    });

    if (!event) {
      throw new NotFoundException(CALENDAR_ERROR_MESSAGES.EVENT_NOT_FOUND);
    }

    return event;
  }

  private assertCanViewEvent(userId: string, event: EventWithRelations) {
    const isCalendarOwner = event.calendar.ownerUserId === userId;
    const isAttendee = event.attendees.some(
      (attendee) => attendee.userId === userId,
    );

    const isPublic = event.visibility === EventVisibility.PUBLIC;

    if (!isCalendarOwner && !isAttendee && !isPublic) {
      throw new ForbiddenException(CALENDAR_ERROR_MESSAGES.FORBIDDEN_EVENT);
    }
  }

  private assertCanManageEvent(userId: string, event: EventWithRelations) {
    const isCalendarOwner = event.calendar.ownerUserId === userId;
    const isCreator = event.createdBy === userId;

    if (!isCalendarOwner && !isCreator) {
      throw new ForbiddenException(
        CALENDAR_ERROR_MESSAGES.FORBIDDEN_EVENT_UPDATE,
      );
    }
  }

  private assertUserManagedEvent(event: EventWithRelations) {
    if (event.sourceType !== EventSourceType.USER) {
      throw new ForbiddenException(
        CALENDAR_ERROR_MESSAGES.EXTERNAL_EVENT_READ_ONLY,
      );
    }
  }

  private attachPermissions<T extends EventWithRelations>(
    userId: string,
    event: T,
  ): Omit<T, 'documents' | 'recurrenceSeries'> & {
    documentIds: string[];
    exceptionDates: string[];
    recurrenceRule: string | null;
    recurrenceParentId: string | null;
    timeZone: string;
    permissions: { canManage: boolean; canRespond: boolean };
  } {
    const canManage =
      event.sourceType === EventSourceType.USER &&
      (event.calendar.ownerUserId === userId || event.createdBy === userId);
    const canRespond = event.attendees.some(
      (attendee) => attendee.userId === userId,
    );
    const { documents, recurrenceSeries, ...publicEvent } = event;

    return {
      ...publicEvent,
      documentIds: documents.map((document) => document.documentId),
      exceptionDates:
        recurrenceSeries?.exceptions.map((exception) =>
          exception.occurrenceStart.toISOString(),
        ) ?? [],
      recurrenceRule: recurrenceSeries?.recurrenceRule ?? null,
      recurrenceParentId: recurrenceSeries?.id ?? null,
      timeZone: recurrenceSeries?.timeZone ?? event.calendar.timeZone,
      permissions: { canManage, canRespond },
    };
  }

  private assertValidRange(startAt: string, endAt: string) {
    if (new Date(endAt) <= new Date(startAt)) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_EVENT_RANGE,
      );
    }
  }

  private assertValidQueryRange(startAt?: string, endAt?: string) {
    if (!startAt && !endAt) return;
    if (!startAt || !endAt) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_QUERY_RANGE,
      );
    }

    const start = new Date(startAt);
    const end = new Date(endAt);
    const maximumRange =
      CALENDAR_DEFAULTS.MAX_QUERY_RANGE_DAYS * 24 * 60 * 60 * 1000;
    if (end <= start || end.getTime() - start.getTime() > maximumRange) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_QUERY_RANGE,
      );
    }
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

  private async copyOccurrenceRelations(
    tx: Prisma.TransactionClient,
    eventId: string,
    event: EventWithRelations,
    dto: UpdateCalendarEventDto,
    startAt: Date,
  ): Promise<void> {
    const documentIds =
      dto.documentIds ?? event.documents.map((item) => item.documentId);
    if (documentIds.length > 0) {
      await tx.calendarEventDocument.createMany({
        data: [...new Set(documentIds)].map((documentId) => ({
          eventId,
          documentId,
        })),
      });
    }

    const attendees = dto.attendees
      ? this.normalizeAttendees(event.createdBy, dto.attendees)
      : event.attendees.map((attendee) => ({
          userId: attendee.userId,
          optional: attendee.optional,
        }));
    if (attendees.length > 0) {
      await tx.calendarEventAttendee.createMany({
        data: attendees.map((attendee) => ({
          eventId,
          userId: attendee.userId,
          optional: attendee.optional ?? false,
          responseStatus:
            attendee.userId === event.createdBy
              ? AttendeeResponseStatus.ACCEPTED
              : AttendeeResponseStatus.NEEDS_ACTION,
        })),
        skipDuplicates: true,
      });
    }

    const reminders = dto.reminders
      ? this.normalizeReminders(dto.reminders)
      : event.reminders.map((reminder) => ({
          minutesBefore: reminder.minutesBefore,
          method: reminder.method,
        }));
    if (reminders.length > 0) {
      await tx.reminder.createMany({
        data: reminders.map((reminder) => ({
          eventId,
          minutesBefore: reminder.minutesBefore,
          method: reminder.method,
          scheduledAt: this.getReminderScheduledAt(
            startAt,
            reminder.minutesBefore,
          ),
        })),
      });
    }
  }

  private async createSeriesRelations(
    tx: Prisma.TransactionClient,
    seriesId: string,
    inputs: SeriesRelationInputs,
  ): Promise<void> {
    if (inputs.attendees.length > 0) {
      await tx.recurrenceSeriesAttendee.createMany({
        data: inputs.attendees.map((attendee) => ({
          seriesId,
          userId: attendee.userId,
          optional: attendee.optional ?? false,
        })),
        skipDuplicates: true,
      });
    }
    if (inputs.reminders.length > 0) {
      await tx.recurrenceSeriesReminder.createMany({
        data: inputs.reminders.map((reminder) => ({
          seriesId,
          minutesBefore: reminder.minutesBefore,
          method: reminder.method,
        })),
        skipDuplicates: true,
      });
    }
    if (inputs.documentIds.length > 0) {
      await tx.recurrenceSeriesDocument.createMany({
        data: [...new Set(inputs.documentIds)].map((documentId) => ({
          seriesId,
          documentId,
        })),
        skipDuplicates: true,
      });
    }
    if (inputs.exceptionDates.length > 0) {
      await tx.recurrenceException.createMany({
        data: [...new Set(inputs.exceptionDates)].map((occurrenceStart) => ({
          seriesId,
          occurrenceStart: new Date(occurrenceStart),
        })),
        skipDuplicates: true,
      });
    }
  }

  private async replaceSeriesRelations(
    tx: Prisma.TransactionClient,
    seriesId: string,
    creatorUserId: string,
    dto: UpdateCalendarEventDto,
  ): Promise<void> {
    if (dto.attendees !== undefined) {
      await tx.recurrenceSeriesAttendee.deleteMany({ where: { seriesId } });
      const attendees = this.normalizeAttendees(creatorUserId, dto.attendees);
      await this.createSeriesRelations(tx, seriesId, {
        attendees,
        reminders: [],
        documentIds: [],
        exceptionDates: [],
      });
    }
    if (dto.reminders !== undefined) {
      await tx.recurrenceSeriesReminder.deleteMany({ where: { seriesId } });
      await this.createSeriesRelations(tx, seriesId, {
        attendees: [],
        reminders: this.normalizeReminders(dto.reminders),
        documentIds: [],
        exceptionDates: [],
      });
    }
    if (dto.documentIds !== undefined) {
      await tx.recurrenceSeriesDocument.deleteMany({ where: { seriesId } });
      await this.createSeriesRelations(tx, seriesId, {
        attendees: [],
        reminders: [],
        documentIds: dto.documentIds,
        exceptionDates: [],
      });
    }
    if (dto.exceptionDates !== undefined) {
      await tx.recurrenceException.deleteMany({ where: { seriesId } });
      await this.createSeriesRelations(tx, seriesId, {
        attendees: [],
        reminders: [],
        documentIds: [],
        exceptionDates: dto.exceptionDates,
      });
    }
  }

  private async getFirstSeriesOccurrence(userId: string, seriesId: string) {
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
    return this.getEventById(userId, occurrence.id);
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

  private async replaceEventRelations(
    tx: Prisma.TransactionClient,
    target: EventWithRelations,
    nextStartAt: Date,
    dto: UpdateCalendarEventDto,
  ): Promise<void> {
    if (dto.documentIds !== undefined) {
      await tx.calendarEventDocument.deleteMany({
        where: { eventId: target.id },
      });
      if (dto.documentIds.length > 0) {
        await tx.calendarEventDocument.createMany({
          data: [...new Set(dto.documentIds)].map((documentId) => ({
            eventId: target.id,
            documentId,
          })),
        });
      }
    }

    if (dto.attendees) {
      const attendeeInputs = this.normalizeAttendees(
        target.createdBy,
        dto.attendees,
      );
      await tx.calendarEventAttendee.deleteMany({
        where: { eventId: target.id },
      });
      await tx.calendarEventAttendee.createMany({
        data: attendeeInputs.map((attendee) => ({
          eventId: target.id,
          userId: attendee.userId,
          optional: attendee.optional ?? false,
          responseStatus:
            attendee.userId === target.createdBy
              ? AttendeeResponseStatus.ACCEPTED
              : AttendeeResponseStatus.NEEDS_ACTION,
        })),
        skipDuplicates: true,
      });
    }

    if (dto.reminders) {
      const reminderInputs = this.normalizeReminders(dto.reminders);
      await tx.reminder.deleteMany({ where: { eventId: target.id } });
      if (reminderInputs.length > 0) {
        await tx.reminder.createMany({
          data: reminderInputs.map((reminder) => ({
            eventId: target.id,
            minutesBefore: reminder.minutesBefore,
            method: reminder.method,
            scheduledAt: this.getReminderScheduledAt(
              nextStartAt,
              reminder.minutesBefore,
            ),
            deliveryStatus: ReminderDeliveryStatus.PENDING,
          })),
        });
      }
    } else if (nextStartAt.getTime() !== target.startAt.getTime()) {
      for (const reminder of target.reminders as Array<{
        id: string;
        minutesBefore: number;
      }>) {
        await tx.reminder.update({
          where: { id: reminder.id },
          data: {
            scheduledAt: this.getReminderScheduledAt(
              nextStartAt,
              reminder.minutesBefore,
            ),
            deliveryStatus: ReminderDeliveryStatus.PENDING,
            attemptCount: 0,
            nextAttemptAt: null,
            dispatchedAt: null,
            lastError: null,
          },
        });
      }
    }
  }

  private getReminderScheduledAt(startAt: Date, minutesBefore: number): Date {
    return new Date(startAt.getTime() - minutesBefore * 60_000);
  }

  private normalizeAttendees(
    creatorUserId: string,
    attendees: CalendarEventAttendeeDto[] = [],
  ): CalendarEventAttendeeDto[] {
    const byUserId = new Map<string, CalendarEventAttendeeDto>();
    byUserId.set(creatorUserId, { userId: creatorUserId, optional: false });

    attendees.forEach((attendee) => {
      byUserId.set(attendee.userId, attendee);
    });

    return [...byUserId.values()];
  }

  private normalizeReminders(
    reminders: CalendarEventReminderDto[] = [],
  ): CalendarEventReminderDto[] {
    const seen = new Set<string>();
    return reminders.filter((reminder) => {
      const key = `${reminder.method}:${reminder.minutesBefore}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private eventInclude() {
    return eventWithRelationsInclude;
  }
}
