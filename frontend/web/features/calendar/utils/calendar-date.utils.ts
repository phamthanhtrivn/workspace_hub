import { CalendarEvent } from "../types/calendar.types";

export function toDateTimeLocal(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value: string): string {
  return new Date(value).toISOString();
}

export function formatCalendarEventRange(
  event: CalendarEvent,
  locale: string,
): string {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const timeStyle = event.allDay ? undefined : "short";

  return `${start.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle,
  })} - ${end.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle,
  })}`;
}
