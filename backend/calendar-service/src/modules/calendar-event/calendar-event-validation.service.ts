import { BadRequestException, Injectable } from '@nestjs/common';
import { EventSourceType, EventStatus } from '@prisma/client';
import { CALENDAR_ERROR_MESSAGES } from '../../common/constants/calendar.constants';
import { EventWithRelations } from './calendar-event.types';

@Injectable()
export class CalendarEventValidationService {
  constructor() {}
  assertValidRange(startAt: string, endAt: string): void {
    if (new Date(endAt) <= new Date(startAt)) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_EVENT_RANGE,
      );
    }
  }

  getCancelledAt(status?: EventStatus): Date | null | undefined {
    if (status === EventStatus.CANCELLED) return new Date();
    return status ? null : undefined;
  }

  isTaskEvent(event: Pick<EventWithRelations, 'sourceType' | 'description'>) {
    return (
      event.sourceType === EventSourceType.TASK ||
      (typeof event.description === 'string' &&
        event.description.includes('[TASK]'))
    );
  }
}
