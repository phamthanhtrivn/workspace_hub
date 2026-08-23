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
  EventStatus,
  Prisma,
} from '@prisma/client';
import {
  CALENDAR_ERROR_MESSAGES,
} from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { CalendarEventAttendeeDto } from './dto/calendar-event-attendee.dto';
import { CalendarEventReminderDto } from './dto/calendar-event-reminder.dto';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';

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
  ) {}

  async createEvent(userId: string, dto: CreateCalendarEventDto) {
    const calendar = await this.assertCalendarOwner(userId, dto.calendarId);
    this.assertValidRange(dto.startAt, dto.endAt);

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
          })),
        });
      }

      return createdEvent;
    });

    return this.getEventById(userId, event.id);
  }

  async getEvents(
    userId: string,
    filters: {
      startAt?: string;
      endAt?: string;
      calendarId?: string;
      projectId?: string;
    },
  ) {
    const where: Prisma.CalendarEventWhereInput = {
      status: { not: EventStatus.CANCELLED },
      OR: [
        { calendar: { ownerUserId: userId } },
        { attendees: { some: { userId } } },
      ],
    };

    if (filters.startAt || filters.endAt) {
      where.AND = [
        filters.endAt ? { startAt: { lte: new Date(filters.endAt) } } : {},
        filters.startAt ? { endAt: { gte: new Date(filters.startAt) } } : {},
      ];
    }

    if (filters.calendarId) {
      where.calendarId = filters.calendarId;
    }

    if (filters.projectId) {
      where.calendar = {
        ...((where.calendar as Prisma.CalendarWhereInput | undefined) ?? {}),
        projectId: filters.projectId,
      };
    }

    const events = await this.prisma.calendarEvent.findMany({
      where,
      include: this.eventInclude(),
      orderBy: { startAt: 'asc' },
    });

    return this.userProfileSnapshotService.attachProfilesToEvents(events);
  }

  async getEventById(userId: string, eventId: string) {
    const event = await this.findEventOrThrow(eventId);
    this.assertCanViewEvent(userId, event);

    const [enrichedEvent] =
      await this.userProfileSnapshotService.attachProfilesToEvents([event]);
    return enrichedEvent;
  }

  async updateEvent(
    userId: string,
    eventId: string,
    dto: UpdateCalendarEventDto,
  ) {
    const event = await this.findEventOrThrow(eventId);
    this.assertCanManageEvent(userId, event);

    const targetCalendar = dto.calendarId
      ? await this.assertCalendarOwner(userId, dto.calendarId)
      : event.calendar;
    const startAt = dto.startAt ?? event.startAt.toISOString();
    const endAt = dto.endAt ?? event.endAt.toISOString();
    this.assertValidRange(startAt, endAt);

    await this.prisma.$transaction(async (tx) => {
      await tx.calendarEvent.update({
        where: { id: eventId },
        data: {
          calendarId: targetCalendar.id,
          updatedBy: userId,
          title: dto.title,
          description: dto.description,
          location: dto.location,
          startAt: dto.startAt ? new Date(dto.startAt) : undefined,
          endAt: dto.endAt ? new Date(dto.endAt) : undefined,
          allDay: dto.allDay,
          color: dto.color,
          status: dto.status,
          visibility: dto.visibility,
          recurrenceRule: dto.recurrenceRule,
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

      if (dto.attendees) {
        const attendeeInputs = this.normalizeAttendees(
          event.createdBy,
          dto.attendees,
        );
        await tx.calendarEventAttendee.deleteMany({
          where: { eventId },
        });
        await tx.calendarEventAttendee.createMany({
          data: attendeeInputs.map((attendee) => ({
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

      if (dto.reminders) {
        const reminderInputs = this.normalizeReminders(dto.reminders);
        await tx.reminder.deleteMany({ where: { eventId } });
        if (reminderInputs.length > 0) {
          await tx.reminder.createMany({
            data: reminderInputs.map((reminder) => ({
              eventId,
              minutesBefore: reminder.minutesBefore,
              method: reminder.method,
            })),
          });
        }
      }
    });

    return this.getEventById(userId, eventId);
  }

  async cancelEvent(userId: string, eventId: string): Promise<void> {
    const event = await this.findEventOrThrow(eventId);
    this.assertCanManageEvent(userId, event);

    await this.prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        status: EventStatus.CANCELLED,
        updatedBy: userId,
        cancelledAt: new Date(),
      },
    });
  }

  async updateResponse(
    userId: string,
    eventId: string,
    responseStatus: AttendeeResponseStatus,
  ) {
    await this.findEventOrThrow(eventId);

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

    if (!isCalendarOwner && !isAttendee) {
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

  private assertValidRange(startAt: string, endAt: string) {
    if (new Date(endAt) <= new Date(startAt)) {
      throw new BadRequestException(CALENDAR_ERROR_MESSAGES.INVALID_EVENT_RANGE);
    }
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
