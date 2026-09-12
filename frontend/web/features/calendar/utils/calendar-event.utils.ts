import { EventInput } from "@fullcalendar/core";
import {
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventFilters,
  EventSourceType,
} from "../types/calendar.types";
import {
  CALENDAR_DEFAULT_EVENT_COLOR,
  CALENDAR_DEFAULT_EVENT_DURATION_MS,
  CALENDAR_INITIAL_RANGE_LOOKAHEAD_DAYS,
  CALENDAR_INITIAL_RANGE_LOOKBACK_DAYS,
} from "../types/calendar.constants";
import {
  formatLocalDateKey,
  getExclusiveAllDayEndDateKey,
  isAllDayDateTimeRange,
} from "./calendar-date.utils";

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

export function isTaskCalendarEvent(event?: {
  sourceType?: EventSourceType;
  description?: string | null;
  extendedProps?: Record<string, unknown>;
} | null): boolean {
  if (!event) return false;
  if (event.sourceType === EventSourceType.TASK) return true;
  if (event.extendedProps?.sourceType === EventSourceType.TASK) return true;
  if (
    typeof event.description === "string" &&
    event.description.includes("[TASK]")
  ) {
    return true;
  }
  const extDesc = event.extendedProps?.description;
  if (typeof extDesc === "string" && extDesc.includes("[TASK]")) {
    return true;
  }
  return false;
}

export function cleanTaskDescription(
  description: string | null | undefined,
): string {
  if (!description) return "";
  return description
    .replace(/^\[TASK\]\s*/, "")
    .replace(/\n?\[TASK\]\s*/g, "")
    .trim();
}

export function mapCalendarEventToFullCalendar(
  event: CalendarEvent,
  colorOverride?: string,
): EventInput {
  const isTask = isTaskCalendarEvent(event);
  const normalizedSourceType = isTask
    ? EventSourceType.TASK
    : event.sourceType;
  const calendarColor =
    colorOverride || event.calendar?.color || CALENDAR_DEFAULT_EVENT_COLOR;
  const eventColor = colorOverride || event.color || calendarColor;
  const allDay =
    event.allDay || isAllDayDateTimeRange(event.startAt, event.endAt);
  const normalizedEvent = {
    ...event,
    allDay: allDay === event.allDay ? event.allDay : true,
    sourceType: normalizedSourceType,
  };

  return {
    id: event.id,
    title: event.title,
    start: allDay ? formatLocalDateKey(event.startAt) : event.startAt,
    end: allDay
      ? getExclusiveAllDayEndDateKey(event.endAt)
      : event.endAt,
    allDay,
    backgroundColor: eventColor,
    borderColor: eventColor,
    textColor: "#ffffff",
    classNames: [
      isTask ? "calendar-task-event" : "calendar-user-event",
    ],
    editable: event.permissions?.canManage ?? false,
    durationEditable: event.permissions?.canManage ?? false,
    startEditable: event.permissions?.canManage ?? false,
    extendedProps: {
      model: normalizedEvent,
      calendarId: event.calendarId,
      attendees: event.attendees,
      reminders: event.reminders,
      visibility: event.visibility,
      status: event.status,
      location: event.location,
      description: event.description,
      sourceType: normalizedSourceType,
      calendarColor,
      eventColor,
      hasCustomEventColor: !colorOverride && Boolean(event.color),
    },
  };
}
