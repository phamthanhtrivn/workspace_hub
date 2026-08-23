import { EventInput } from "@fullcalendar/core";
import {
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventFilters,
} from "../types/calendar.types";
import {
  CALENDAR_DEFAULT_EVENT_COLOR,
  CALENDAR_DEFAULT_EVENT_DURATION_MS,
  CALENDAR_INITIAL_RANGE_LOOKAHEAD_DAYS,
  CALENDAR_INITIAL_RANGE_LOOKBACK_DAYS,
} from "../types/calendar.constants";

export function createInitialCalendarRange(): CalendarEventFilters {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - CALENDAR_INITIAL_RANGE_LOOKBACK_DAYS);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setDate(now.getDate() + CALENDAR_INITIAL_RANGE_LOOKAHEAD_DAYS);
  end.setHours(23, 59, 59, 999);

  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

export function createDefaultEventDraft(
  calendarId?: string,
): CalendarEventDraft {
  const startAt = new Date();
  startAt.setMinutes(0, 0, 0);
  startAt.setHours(startAt.getHours() + 1);

  const endAt = createEventEndFromStart(startAt);

  return { startAt, endAt, calendarId };
}

export function createEventEndFromStart(startAt: Date): Date {
  return new Date(startAt.getTime() + CALENDAR_DEFAULT_EVENT_DURATION_MS);
}

export function mapCalendarEventToFullCalendar(
  event: CalendarEvent,
): EventInput {
  const color =
    event.color || event.calendar?.color || CALENDAR_DEFAULT_EVENT_COLOR;

  return {
    id: event.id,
    title: event.title,
    start: event.startAt,
    end: event.endAt,
    allDay: event.allDay,
    backgroundColor: color,
    borderColor: color,
    textColor: "#ffffff",
    extendedProps: {
      model: event,
      calendarId: event.calendarId,
      attendees: event.attendees,
      reminders: event.reminders,
      visibility: event.visibility,
      status: event.status,
      location: event.location,
      description: event.description,
    },
  };
}
