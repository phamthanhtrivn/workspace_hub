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

  assertTaskDeadlineCompatibility(
    isTask: boolean,
    currentDescription: string | null | undefined,
    nextDescription: string | null | undefined,
    hasExistingRecurrence: boolean,
    nextRecurrenceRule: string | null | undefined,
  ): void {
    if (!isTask || !this.hasTaskDeadline(nextDescription)) return;

    const deadlineAlreadyExisted = this.hasTaskDeadline(currentDescription);
    const addingRecurrence = Boolean(nextRecurrenceRule);
    const addingDeadline = !deadlineAlreadyExisted;
    if (
      (hasExistingRecurrence && addingDeadline) ||
      (!hasExistingRecurrence && addingRecurrence)
    ) {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.RECURRING_TASK_DEADLINE,
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


  private hasTaskDeadline(description: string | null | undefined): boolean {
    return Boolean(
      description &&
        /\[(?:Deadline|H\u1ea1n ch\u00f3t):\s*\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?\]/i.test(
          description,
        ),
    );
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
