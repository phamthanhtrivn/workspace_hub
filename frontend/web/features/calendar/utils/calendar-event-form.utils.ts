import { CalendarEventEditorValues } from "../schemas/calendar-event-form.schema";
import { getDisplayTimezone, zonedDateKey } from "@/lib/timezone";
import {
  CALENDAR_COLOR_CHOICES,
} from "../types/calendar.constants";
import {
  CalendarEvent,
  CalendarEventAttendeePayload,
  CalendarEventDraft,
  EventSourceType,
  EventStatus,
  EventVisibility,
  RecurrenceScope,
  ReminderMethod,
} from "../types/calendar.types";
import {
  composeDateTimeLocal,
  getDateInputValue,
  isAllDayDateTimeRange,
  toDateTimeLocal,
} from "./calendar-date.utils";

interface CalendarEventFormDefaultsInput {
  calendarTimeZone?: string;
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

  return new Date(startAt.getTime() + 60 * 60_000);
}

function getEditableAttendees(
  event?: CalendarEvent | null,
  draft?: CalendarEventDraft | null,
) {
  if (event) {
    return (event.attendees ?? [])
      .filter((attendee) => attendee.userId !== event?.createdBy)
      .map(({ userId, optional, profile, responseStatus }) => ({
        userId,
        responseStatus,
        optional: optional ?? false,
        ...(profile
          ? {
              profile: {
                fullName: profile.fullName ?? null,
                email: profile.email ?? null,
                avatarUrl: profile.avatarUrl ?? null,
              },
            }
          : {}),
      }));
  }
  if (draft?.attendees) {
    return draft.attendees;
  }
  return [];
}

export function createCalendarEventFormDefaults({
  calendarId,
  draft,
  event,
  calendarTimeZone,
}: CalendarEventFormDefaultsInput): CalendarEventFormDefaults {
  const defaultStart = event?.startAt
    ? new Date(event.startAt)
    : draft?.startAt ?? new Date();
  const defaultEnd = getDefaultEnd(defaultStart, draft, event);
  const timeZone = event?.allDay ? event.timeZone || calendarTimeZone || getDisplayTimezone() : getDisplayTimezone();
  const allDay = Boolean(
    event?.allDay ||
      (event && isAllDayDateTimeRange(defaultStart, defaultEnd)) ||
      draft?.allDay,
  );

  let initialStartAt = toDateTimeLocal(defaultStart, timeZone);
  let initialEndAt = toDateTimeLocal(defaultEnd, timeZone);

  if (allDay) {
    const startDateStr = getDateInputValue(initialStartAt);
    let endDateStr = getDateInputValue(initialEndAt);

    if (
      initialEndAt.endsWith("T00:00") &&
      defaultEnd.getTime() > defaultStart.getTime()
    ) {
      const adjusted = new Date(defaultEnd.getTime() - 1);
      endDateStr = zonedDateKey(adjusted, timeZone);
    }

    initialStartAt = composeDateTimeLocal(startDateStr, "00:00");
    initialEndAt = composeDateTimeLocal(endDateStr, "23:59");
  }

  return {
    defaultStart,
    attendees: getEditableAttendees(event, draft),
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
      startAt: initialStartAt,
      endAt: initialEndAt,
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
      sourceType: event?.sourceType ?? draft?.sourceType ?? EventSourceType.USER,
    },
  };
}
