import { describe, expect, it } from 'vitest';
import {
  formatCalendarEventRange,
  formatReminderLabel,
  isSameDate,
} from './calendar-date.utils';
import {
  CalendarEvent,
  EventSourceType,
  EventStatus,
  EventVisibility,
} from '../types/calendar.types';

function createMockEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'test-event-1',
    calendarId: 'cal-1',
    createdBy: 'user-1',
    updatedBy: null,
    title: 'Test Event',
    description: null,
    location: null,
    startAt: '2026-09-06T11:30:00.000Z',
    endAt: '2026-09-06T12:30:00.000Z',
    allDay: false,
    color: null,
    status: EventStatus.CONFIRMED,
    visibility: EventVisibility.DEFAULT,
    recurrenceRule: null,
    recurrenceParentId: null,
    timeZone: 'Asia/Ho_Chi_Minh',
    originalStartAt: null,
    sourceType: EventSourceType.USER,
    sourceId: null,
    exceptionDates: [],
    documentIds: [],
    cancelledAt: null,
    createdAt: '2026-09-06T00:00:00.000Z',
    updatedAt: '2026-09-06T00:00:00.000Z',
    ...overrides,
  };
}

describe('calendar-date.utils', () => {
  it('formats same-day event range cleanly with bullet separator', () => {
    const event = createMockEvent({
      startAt: '2026-09-06T11:30:00.000',
      endAt: '2026-09-06T12:30:00.000',
    });
    const formatted = formatCalendarEventRange(event, 'vi');
    expect(formatted).toContain('•');
  });

  it('formats all-day event on same date without time', () => {
    const event = createMockEvent({
      startAt: '2026-09-06T00:00:00.000',
      endAt: '2026-09-06T23:59:59.000',
      allDay: true,
    });
    const formatted = formatCalendarEventRange(event, 'vi');
    expect(formatted).not.toContain('•');
  });

  it('formats reminders with relative minutes, hours, days', () => {
    expect(formatReminderLabel(10, 'vi')).toBe('10 phút trước');
    expect(formatReminderLabel(30, 'vi')).toBe('30 phút trước');
    expect(formatReminderLabel(60, 'vi')).toBe('1 giờ trước');
    expect(formatReminderLabel(1440, 'vi')).toBe('1 ngày trước');
    expect(formatReminderLabel(30, 'en-US')).toBe('30 minutes before');
  });

  it('detects same date correctly', () => {
    const d1 = new Date('2026-09-06T10:00:00');
    const d2 = new Date('2026-09-06T18:00:00');
    const d3 = new Date('2026-09-07T10:00:00');
    expect(isSameDate(d1, d2)).toBe(true);
    expect(isSameDate(d1, d3)).toBe(false);
  });
});
