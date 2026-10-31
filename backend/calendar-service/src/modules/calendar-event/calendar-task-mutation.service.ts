import { BadRequestException, Injectable } from '@nestjs/common';
import { EventSourceType } from '@prisma/client';
import { CALENDAR_ERROR_MESSAGES } from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { eventWithRelationsInclude } from './calendar-event.types';
import { EventAccessPolicy } from './event-access.policy';
import { CalendarEventValidationService } from './calendar-event-validation.service';
import { CalendarEventQueryService } from './calendar-event-query.service';

@Injectable()
export class CalendarTaskMutationService {
  constructor(
    private readonly accessPolicy: EventAccessPolicy,
    private readonly prisma: PrismaService,
    private readonly validation: CalendarEventValidationService,
    private readonly queries: CalendarEventQueryService,
  ) {}
  async updateTaskCompletion(
    userId: string,
    eventId: string,
    completed: boolean,
  ) {
    const event = await this.accessPolicy.findEventOrThrow(eventId);
    this.accessPolicy.assertCanManageEvent(userId, event);
    this.accessPolicy.assertPersonalCalendar(event.calendar);
    this.accessPolicy.assertUserManagedEvent(event);
    if (!this.validation.isTaskEvent(event)) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.ONLY_TASKS_CAN_BE_COMPLETED,
      );
    }

    await this.prisma.calendarEvent.update({
      where: { id: event.id },
      data: {
        sourceType: EventSourceType.TASK,
        completedAt: completed ? new Date() : null,
        updatedBy: userId,
        isRecurrenceOverride: event.recurrenceSeries ? true : undefined,
      },
    });
    return this.queries.getEventById(userId, event.id);
  }

  async updateTaskOrder(userId: string, eventIds: string[]) {
    const events = await this.prisma.calendarEvent.findMany({
      where: { id: { in: eventIds } },
      include: eventWithRelationsInclude,
    });
    if (events.length !== eventIds.length) {
      throw new BadRequestException(CALENDAR_ERROR_MESSAGES.INVALID_TASK_ORDER);
    }

    for (const event of events) {
      this.accessPolicy.assertCanManageEvent(userId, event);
      this.accessPolicy.assertPersonalCalendar(event.calendar);
      this.accessPolicy.assertUserManagedEvent(event);
      if (!this.validation.isTaskEvent(event)) {
        throw new BadRequestException(
          CALENDAR_ERROR_MESSAGES.INVALID_TASK_ORDER,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        eventIds.map((eventId, taskOrder) =>
          tx.calendarEvent.update({
            where: { id: eventId },
            data: { taskOrder, updatedBy: userId },
          }),
        ),
      );
    });
    return eventIds;
  }
}
