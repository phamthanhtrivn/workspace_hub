import { CalendarEventEditorValues } from "../schemas/calendar-event-form.schema";
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
    .map(({ userId, optional, profile }) => ({
      userId,
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

  let initialStartAt = toDateTimeLocal(defaultStart);
  let initialEndAt = toDateTimeLocal(defaultEnd);

  if (allDay) {
    const startDateStr = getDateInputValue(initialStartAt);
    let endDateStr = getDateInputValue(initialEndAt);

    if (
      defaultEnd.getHours() === 0 &&
      defaultEnd.getMinutes() === 0 &&
      defaultEnd.getTime() > defaultStart.getTime()
    ) {
      const adjusted = new Date(defaultEnd.getTime() - 1);
      endDateStr = getDateInputValue(toDateTimeLocal(adjusted));
    }

    initialStartAt = composeDateTimeLocal(startDateStr, "00:00");
    initialEndAt = composeDateTimeLocal(endDateStr, "23:59");
  }

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
