import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendeeResponseStatus,
  Calendar,
  CalendarEvent,
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

type EventWithRelations = CalendarEvent & {
  calendar: Calendar;
  attendees: Array<{ userId: string } & Record<string, unknown>>;
  reminders: Array<Record<string, unknown>>;
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
          recurrenceRule: dto.recurrenceRule ?? null,
          originalStartAt: dto.recurrenceRule ? new Date(dto.startAt) : null,
          exceptionDates: this.toDateArray(dto.exceptionDates),
          documentIds: dto.documentIds ?? [],
        },
      });

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

    if (dto.recurrenceRule) {
      await this.recurrenceService.materializeSeriesThrough(
        event.id,
        this.recurrenceService.getDefaultGenerationEnd(event.startAt),
      );
    }

    return this.getEventById(userId, event.id);
  }

  async getEvents(userId: string, filters: GetCalendarEventsQueryDto) {
    this.assertValidQueryRange(filters.startAt, filters.endAt);
    await this.resourceAccess.assertProjectAccess(userId, filters.projectId);
    if (filters.endAt) {
      await this.recurrenceService.materializeAllSeriesThrough(
        new Date(filters.endAt),
      );
    }

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
    const scope = dto.recurrenceScope ?? RecurrenceScope.THIS;
    const series = await this.getSeriesEvents(event);
    const isRecurring = series.length > 1 || Boolean(event.recurrenceRule);
    let targets = this.selectScopeEvents(series, event, scope);
    let resultEventId = eventId;
    let materializeRootId: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      if (
        isRecurring &&
        scope === RecurrenceScope.THIS_AND_FOLLOWING &&
        event.recurrenceParentId
      ) {
        const originalRoot = series.find(
          (candidate) => candidate.id === event.recurrenceParentId,
        );
        if (originalRoot?.recurrenceRule) {
          const nextRule = this.recurrenceService.remainingRule(
            originalRoot.recurrenceRule,
            originalRoot.startAt,
            event.startAt,
          );
          await tx.calendarEvent.update({
            where: { id: originalRoot.id },
            data: {
              recurrenceRule: this.recurrenceService.truncateBefore(
                originalRoot.recurrenceRule,
                event.startAt,
              ),
              recurrenceGeneratedUntil: event.startAt,
            },
          });
          await tx.calendarEvent.update({
            where: { id: event.id },
            data: {
              recurrenceParentId: null,
              originalStartAt: event.startAt,
              recurrenceRule: dto.recurrenceRule ?? nextRule,
              recurrenceGeneratedUntil: null,
            },
          });
          await tx.calendarEvent.updateMany({
            where: {
              id: { in: targets.map((target) => target.id), not: event.id },
            },
            data: {
              recurrenceParentId: event.id,
              recurrenceRule: dto.recurrenceRule ?? nextRule,
            },
          });
          materializeRootId = event.id;
        }
      }

      const regenerate =
        isRecurring &&
        dto.recurrenceRule !== undefined &&
        scope !== RecurrenceScope.THIS;
      if (regenerate) {
        const rootId =
          scope === RecurrenceScope.ALL
            ? (event.recurrenceParentId ?? event.id)
            : event.id;
        await tx.calendarEvent.deleteMany({
          where: { recurrenceParentId: rootId },
        });
        const rootTarget =
          series.find((target) => target.id === rootId) ?? event;
        targets = [rootTarget];
        resultEventId = rootId;
        materializeRootId = rootId;
      }

      const startDelta = dto.startAt
        ? new Date(dto.startAt).getTime() - event.startAt.getTime()
        : 0;
      const endDelta = dto.endAt
        ? new Date(dto.endAt).getTime() - event.endAt.getTime()
        : startDelta;

      for (const target of targets) {
        const nextStartAt = new Date(target.startAt.getTime() + startDelta);
        const nextEndAt = new Date(target.endAt.getTime() + endDelta);
        await tx.calendarEvent.update({
          where: { id: target.id },
          data: {
            calendarId: targetCalendar.id,
            updatedBy: userId,
            title: dto.title,
            description: dto.description,
            location: dto.location,
            startAt: dto.startAt ? nextStartAt : undefined,
            endAt: dto.endAt ? nextEndAt : undefined,
            originalStartAt:
              target.originalStartAt && dto.startAt ? nextStartAt : undefined,
            allDay: dto.allDay,
            color: dto.color,
            status: dto.status,
            visibility: dto.visibility,
            recurrenceRule:
              isRecurring && scope === RecurrenceScope.THIS
                ? undefined
                : dto.recurrenceRule,
            recurrenceGeneratedUntil:
              dto.recurrenceRule !== undefined ? null : undefined,
            exceptionDates: dto.exceptionDates
              ? this.toDateArray(dto.exceptionDates)
              : undefined,
            documentIds: dto.documentIds,
            cancelledAt:
              dto.status === EventStatus.CANCELLED
                ? new Date()
                : dto.status
                  ? null
                  : undefined,
          },
        });

        await this.replaceEventRelations(tx, target, nextStartAt, dto);
      }
    });

    if (materializeRootId) {
      await this.recurrenceService.materializeSeriesThrough(
        materializeRootId,
        this.recurrenceService.getDefaultGenerationEnd(new Date(startAt)),
      );
    }

    return this.getEventById(userId, resultEventId);
  }

  async cancelEvent(
    userId: string,
    eventId: string,
    scope: RecurrenceScope = RecurrenceScope.THIS,
  ): Promise<void> {
    const event = await this.findEventOrThrow(eventId);
    this.assertCanManageEvent(userId, event);
    this.assertUserManagedEvent(event);
    const series = await this.getSeriesEvents(event);
    const targets = this.selectScopeEvents(series, event, scope);
    const targetIds = targets.map((target) => target.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.calendarEvent.updateMany({
        where: { id: { in: targetIds } },
        data: {
          status: EventStatus.CANCELLED,
          updatedBy: userId,
          cancelledAt: new Date(),
        },
      });
      await tx.reminder.updateMany({
        where: { eventId: { in: targetIds } },
        data: { deliveryStatus: ReminderDeliveryStatus.CANCELLED },
      });
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
  ): T & {
    permissions: { canManage: boolean; canRespond: boolean };
  } {
    const canManage =
      event.sourceType === EventSourceType.USER &&
      (event.calendar.ownerUserId === userId || event.createdBy === userId);
    const canRespond = event.attendees.some(
      (attendee) => attendee.userId === userId,
    );

    return {
      ...event,
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

  private async getSeriesEvents(
    event: EventWithRelations,
  ): Promise<EventWithRelations[]> {
    const rootId = event.recurrenceParentId ?? event.id;
    if (!event.recurrenceParentId && !event.recurrenceRule) return [event];

    return this.prisma.calendarEvent.findMany({
      where: { OR: [{ id: rootId }, { recurrenceParentId: rootId }] },
      include: this.eventInclude(),
      orderBy: { startAt: 'asc' },
    });
  }

  private selectScopeEvents(
    series: EventWithRelations[],
    selected: EventWithRelations,
    scope: RecurrenceScope,
  ): EventWithRelations[] {
    if (scope === RecurrenceScope.ALL) return series;
    if (scope === RecurrenceScope.THIS_AND_FOLLOWING) {
      return series.filter((event) => event.startAt >= selected.startAt);
    }
    return [selected];
  }

  private async replaceEventRelations(
    tx: Prisma.TransactionClient,
    target: EventWithRelations,
    nextStartAt: Date,
    dto: UpdateCalendarEventDto,
  ): Promise<void> {
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

  private toDateArray(values?: string[]): Date[] {
    return (values ?? []).map((value) => new Date(value));
  }

  private eventInclude() {
    return {
      calendar: true,
      attendees: {
        orderBy: { createdAt: 'asc' },
      },
      reminders: {
        orderBy: { minutesBefore: 'asc' },
      },
    } satisfies Prisma.CalendarEventInclude;
  }
}
