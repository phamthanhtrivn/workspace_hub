import { BadRequestException, Injectable } from '@nestjs/common';
import { EventSourceType, EventStatus } from '@prisma/client';
import {
  CALENDAR_DEFAULTS,
  CALENDAR_ERROR_MESSAGES,
} from '../../common/constants/calendar.constants';
import { EventWithRelations } from './calendar-event.types';

@Injectable()
export class CalendarEventValidationService {
  constructor() {}
  assertValidRange(startAt: string, endAt: string): void {
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end - start < CALENDAR_DEFAULTS.MIN_EVENT_DURATION_MS
    ) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_EVENT_RANGE,
      );
    }
  }

  assertConferenceSupportedForSource(
    isTask: boolean,
    conferenceEnabled: boolean | undefined,
  ): void {
    if (isTask && conferenceEnabled) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.TASK_CONFERENCE_UNSUPPORTED,
      );
    }
  }




  getCancelledAt(status?: EventStatus): Date | null | undefined {
    if (status === EventStatus.CANCELLED) return new Date();
    return status ? null : undefined;
  }

  isTaskEvent(event: Pick<EventWithRelations, 'sourceType'>) {
    return event.sourceType === EventSourceType.TASK;
  }
}
