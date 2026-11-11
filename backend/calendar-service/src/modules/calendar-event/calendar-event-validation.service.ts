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
    currentDate: string | null | undefined,
    nextDate: string | null | undefined,
    hasExistingRecurrence: boolean,
    nextRecurrenceRule: string | null | undefined,
  ): void {
    if (!isTask || !nextDate) return;

    const deadlineAlreadyExisted = Boolean(currentDate);
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

  assertValidTaskDeadline(
    isTask: boolean,
    date: string | null | undefined,
    time: string | null | undefined,
    startAt: string,
    endAt: string,
    timeZone: string,
  ): void {
    if (!date && !time) return;
    if (!isTask) throw new BadRequestException(CALENDAR_ERROR_MESSAGES.ONLY_TASKS_HAVE_DEADLINES);
    const parsed = date ? new Date(`${date}T00:00:00Z`) : null;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !parsed ||
      !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ||
      (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
      throw new BadRequestException(CALENDAR_ERROR_MESSAGES.INVALID_TASK_DEADLINE);
    }
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(time ? endAt : startAt));
    const part = (name: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === name)!.value;
    const boundaryDate = `${part('year')}-${part('month')}-${part('day')}`;
    const boundary = time ? `${boundaryDate}T${part('hour')}:${part('minute')}:${part('second')}` : boundaryDate;
    if ((time ? `${date}T${time}:00` : date) < boundary) {
      throw new BadRequestException(time ? CALENDAR_ERROR_MESSAGES.TASK_DEADLINE_BEFORE_END : CALENDAR_ERROR_MESSAGES.TASK_DEADLINE_BEFORE_START);
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
