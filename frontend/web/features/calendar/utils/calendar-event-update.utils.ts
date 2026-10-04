import {
  CalendarEvent,
  CalendarEventFormValues,
  UpdateCalendarEventPayload,
} from "../types/calendar.types";
import { toDateTimeLocal } from "./calendar-date.utils";

function sameMembers(left: string[], right: string[]) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

export function buildCalendarEventUpdate(
  event: CalendarEvent,
  values: CalendarEventFormValues,
): UpdateCalendarEventPayload {
  const payload: UpdateCalendarEventPayload = {
    recurrenceScope: values.recurrenceScope,
  };
  const scalarFields = [
    "calendarId",
    "title",
    "description",
    "location",
    "allDay",
    "color",
    "visibility",
    "status",
    "sourceType",
    "recurrenceRule",
  ] as const;
  for (const field of scalarFields) {
    const next = values[field];
    if (next !== undefined && next !== (event[field] ?? null)) {
      Object.assign(payload, { [field]: next });
    }
  }
  // The editor only exposes minutes; opening it must not erase seconds.
  for (const field of ["startAt", "endAt"] as const) {
    if (toDateTimeLocal(values[field]) !== toDateTimeLocal(event[field])) {
      payload[field] = values[field];
    }
  }
  if (!sameMembers(values.documentIds ?? [], event.documentIds ?? [])) {
    payload.documentIds = values.documentIds;
  }
  const attendeeKeys = (attendees: NonNullable<typeof values.attendees>) =>
    attendees.map(({ userId, optional }) => `${userId}:${Boolean(optional)}`);
  if (
    !sameMembers(
      attendeeKeys(values.attendees ?? []),
      attendeeKeys(
        (event.attendees ?? []).filter(
          ({ userId }) => userId !== event.createdBy,
        ),
      ),
    )
  ) {
    payload.attendees = values.attendees;
  }
  const reminderKeys = (reminders: typeof values.reminders) =>
    reminders.map(({ method, minutesBefore }) => `${method}:${minutesBefore}`);
  if (
    !sameMembers(
      reminderKeys(values.reminders),
      reminderKeys(event.reminders ?? []),
    )
  ) {
    payload.reminders = values.reminders;
  }
  return payload;
}
