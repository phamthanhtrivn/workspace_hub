import { BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { CALENDAR_REMINDER } from '../constants/calendar-reminder.constants';

const MAX_REMINDER_RECIPIENTS = 1000;
const INVALID_REMINDER = 'Invalid calendar reminder payload';

export interface CalendarReminderPayload {
  eventType: 'CALENDAR_REMINDER_DUE';
  deliveryId: string;
  groupKey?: string;
  scheduledAt?: string;
  minutesBefore?: number;
  method: 'ALERT' | 'PUSH' | 'EMAIL';
  event: {
    id: string;
    title: string;
    startAt: string;
    location?: string | null;
    description?: string | null;
    endAt?: string;
    allDay?: boolean;
    sourceType?: 'USER' | 'TASK';
    calendarName?: string;
    timeZone?: string;
  };
  recipients: Array<{
    userId: string;
    email?: string | null;
    fullName?: string | null;
  }>;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function optionalText(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

export function parseCalendarReminder(
  message: unknown,
): CalendarReminderPayload | null {
  if (!record(message)) throw new BadRequestException(INVALID_REMINDER);
  const payload = 'value' in message ? message.value : message;
  if (!record(payload)) throw new BadRequestException(INVALID_REMINDER);
  if (payload.eventType !== 'CALENDAR_REMINDER_DUE') return null;
  const event = payload.event;
  if (
    typeof payload.deliveryId !== 'string' ||
    !payload.deliveryId ||
    (payload.groupKey !== undefined &&
      (typeof payload.groupKey !== 'string' ||
        !/^[a-f0-9]{64}$/.test(payload.groupKey))) ||
    (payload.scheduledAt !== undefined &&
      (typeof payload.scheduledAt !== 'string' ||
        !Number.isFinite(Date.parse(payload.scheduledAt)))) ||
    (payload.minutesBefore !== undefined &&
      (typeof payload.minutesBefore !== 'number' ||
        !Number.isInteger(payload.minutesBefore) ||
        payload.minutesBefore < 0 ||
        payload.minutesBefore > CALENDAR_REMINDER.MAX_MINUTES_BEFORE)) ||
    !['ALERT', 'PUSH', 'EMAIL'].includes(String(payload.method)) ||
    !record(event) ||
    typeof event.id !== 'string' ||
    !isUUID(event.id) ||
    typeof event.title !== 'string' ||
    !event.title ||
    typeof event.startAt !== 'string' ||
    !Number.isFinite(Date.parse(event.startAt)) ||
    !optionalText(event.location) ||
    !optionalText(event.description) ||
    (event.endAt !== undefined &&
      (typeof event.endAt !== 'string' ||
        !Number.isFinite(Date.parse(event.endAt)) ||
        Date.parse(event.endAt) < Date.parse(event.startAt))) ||
    (event.allDay !== undefined && typeof event.allDay !== 'boolean') ||
    (event.sourceType !== undefined &&
      !['USER', 'TASK'].includes(String(event.sourceType))) ||
    (event.calendarName !== undefined &&
      typeof event.calendarName !== 'string') ||
    (event.timeZone !== undefined && !validTimeZone(event.timeZone)) ||
    !Array.isArray(payload.recipients) ||
    !payload.recipients.length ||
    payload.recipients.length > MAX_REMINDER_RECIPIENTS ||
    payload.recipients.some(
      (recipient) =>
        !record(recipient) ||
        typeof recipient.userId !== 'string' ||
        !isUUID(recipient.userId) ||
        !optionalText(recipient.email) ||
        !optionalText(recipient.fullName),
    )
  ) {
    throw new BadRequestException(INVALID_REMINDER);
  }

  return payload as unknown as CalendarReminderPayload;
}

function validTimeZone(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });

    return true;
  } catch {
    return false;
  }
}
