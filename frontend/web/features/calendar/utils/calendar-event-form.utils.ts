import { CalendarEventEditorValues } from "../schemas/calendar-event-form.schema";
import {
  CALENDAR_COLOR_CHOICES,
} from "../types/calendar.constants";
import {
  CalendarEvent,
  CalendarEventAttendeePayload,
  CalendarEventDraft,
  EventStatus,
  EventVisibility,
  RecurrenceScope,
  ReminderMethod,
} from "../types/calendar.types";
import {
  isAllDayDateTimeRange,
  toDateTimeLocal,
} from "./calendar-date.utils";

interface CalendarEventFormDefaultsInput {
  calendarId: string;
  draft?: CalendarEventDraft | null;
  event?: CalendarEvent | null;
}

export interface CalendarEventFormDefaults {
  values: CalendarEventEditorValues;
  defaultStart: Date;
  attendees: CalendarEventAttendeePayload[];
  documentIds: string[];
  showCustomEventColor: boolean;
}

function getDefaultEnd(
  startAt: Date,
  draft?: CalendarEventDraft | null,
  event?: CalendarEvent | null,
) {
  if (event?.endAt) return new Date(event.endAt);
  if (draft?.endAt) return draft.endAt;

  const endAt = new Date(startAt);
  endAt.setHours(endAt.getHours() + 1);
  return endAt;
}

function getEditableAttendees(event?: CalendarEvent | null) {
  return (event?.attendees ?? [])
    .filter((attendee) => attendee.userId !== event?.createdBy)
    .map(({ userId, optional }) => ({ userId, optional: optional ?? false }));
}

export function createCalendarEventFormDefaults({
  calendarId,
  draft,
  event,
}: CalendarEventFormDefaultsInput): CalendarEventFormDefaults {
  const defaultStart = event?.startAt
    ? new Date(event.startAt)
    : draft?.startAt ?? new Date();
  const defaultEnd = getDefaultEnd(defaultStart, draft, event);
  const allDay = Boolean(
    event?.allDay ||
      (event && isAllDayDateTimeRange(defaultStart, defaultEnd)) ||
      draft?.allDay,
  );

  return {
    defaultStart,
    attendees: getEditableAttendees(event),
    documentIds: [...(event?.documentIds ?? [])],
    showCustomEventColor: Boolean(
      event?.color &&
        !(CALENDAR_COLOR_CHOICES as readonly string[]).includes(event.color),
    ),
    values: {
      calendarId: event?.calendarId || draft?.calendarId || calendarId,
      title: event?.title || "",
      description: event?.description || "",
      location: event?.location || "",
      startAt: toDateTimeLocal(defaultStart),
      endAt: toDateTimeLocal(defaultEnd),
      allDay,
      useEventColor: Boolean(event?.color),
      color: event?.color || null,
      visibility: event?.visibility ?? EventVisibility.DEFAULT,
      status: event?.status ?? EventStatus.CONFIRMED,
      recurrenceScope: RecurrenceScope.THIS,
      reminders:
        event?.reminders?.map(({ minutesBefore, method }) => ({
          minutesBefore,
          method,
        })) ?? [{ minutesBefore: 10, method: ReminderMethod.ALERT }],
    },
  };
}
