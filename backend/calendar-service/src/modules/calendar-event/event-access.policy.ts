import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Calendar, EventSourceType, EventVisibility } from '@prisma/client';
import { CALENDAR_ERROR_MESSAGES } from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EventWithRelations,
  eventWithRelationsInclude,
} from './calendar-event.types';

@Injectable()
export class EventAccessPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async assertCalendarOwner(
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

  async findEventOrThrow(eventId: string): Promise<EventWithRelations> {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: eventWithRelationsInclude,
    });
    if (!event) {
      throw new NotFoundException(CALENDAR_ERROR_MESSAGES.EVENT_NOT_FOUND);
    }
    return event;
  }

  assertCanViewEvent(userId: string, event: EventWithRelations): void {
    const canView =
      event.calendar.ownerUserId === userId ||
      event.attendees.some((attendee) => attendee.userId === userId) ||
      event.visibility === EventVisibility.PUBLIC;
    if (!canView) {
      throw new ForbiddenException(CALENDAR_ERROR_MESSAGES.FORBIDDEN_EVENT);
    }
  }

  assertCanManageEvent(userId: string, event: EventWithRelations): void {
    const canManage =
      event.calendar.ownerUserId === userId || event.createdBy === userId;
    if (!canManage) {
      throw new ForbiddenException(
        CALENDAR_ERROR_MESSAGES.FORBIDDEN_EVENT_UPDATE,
      );
    }
  }

  assertUserManagedEvent(event: EventWithRelations): void {
    if (event.sourceType !== EventSourceType.USER) {
      throw new ForbiddenException(
        CALENDAR_ERROR_MESSAGES.EXTERNAL_EVENT_READ_ONLY,
      );
    }
  }
}
