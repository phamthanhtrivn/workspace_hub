import { CalendarEvent } from "../types/calendar.types";
import { CALENDAR_MIN_EVENT_DURATION_MS } from "../types/calendar.constants";
import { formatReminderOptionLabel } from "./calendar-reminder.utils";
import { Temporal } from "temporal-polyfill";
import { fromZonedDateTimeInput, getDisplayTimezone, toZonedDateTimeInput, zonedDateKey } from "@/lib/timezone";

export function toDateTimeLocal(value: Date | string, timeZone = getDisplayTimezone()): string {
  return toZonedDateTimeInput(value, timeZone);
}

export function fromDateTimeLocal(value: string, timeZone = getDisplayTimezone(), originalInstant?: string | null): string {
  return fromZonedDateTimeInput(value, timeZone, originalInstant);
}

export function isAllDayDateTimeRange(
  startValue: Date | string,
  endValue: Date | string,
  timeZone = getDisplayTimezone(),
): boolean {
  const start =
    typeof startValue === "string" ? new Date(startValue) : startValue;
  const end = typeof endValue === "string" ? new Date(endValue) : endValue;

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end.getTime() <= start.getTime()
  ) {
    return false;
  }

  return (
    toDateTimeLocal(start, timeZone).endsWith("T00:00") &&
    start.getUTCSeconds() === 0 &&
    toDateTimeLocal(end, timeZone).endsWith("T23:59")
  );
}

export function formatLocalDateKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getExclusiveAllDayEndDateKey(
  endValue: Date | string,
  startValue?: Date | string,
  timeZone = getDisplayTimezone(),
): string {
  const end = typeof endValue === "string" ? new Date(endValue) : new Date(endValue);
  if (Number.isNaN(end.getTime())) return "";

  const start = startValue
    ? typeof startValue === "string"
      ? new Date(startValue)
      : new Date(startValue)
    : null;

  // If start is provided and end <= start, ensure at least 1 full day from start
  if (start && !Number.isNaN(start.getTime()) && end.getTime() <= start.getTime()) {
    return Temporal.PlainDate.from(zonedDateKey(start, timeZone)).add({ days: 1 }).toString();
  }

  // If end is already at midnight (00:00:00.000) and strictly after start,
  // it is already an exclusive boundary from FullCalendar (e.g. 17/9 00:00 for a 16/9 event).
  // Adding +1 day to it would push the event into an extra day.
  const isMidnight =
    toDateTimeLocal(end, timeZone).endsWith("T00:00") &&
    end.getUTCSeconds() === 0 &&
    end.getMilliseconds() === 0;

  if (isMidnight) {
    return zonedDateKey(end, timeZone);
  }

  // Otherwise, end represents an inclusive time on the event's final day (e.g. 23:59:59).
  // Advance by 1 day to yield FullCalendar's exclusive boundary.
  return Temporal.PlainDate.from(zonedDateKey(end, timeZone)).add({ days: 1 }).toString();
}

export function getDateInputValue(value: string): string {
  return value.split("T")[0] || "";
}

export function getTimeInputValue(value: string): string {
  return value.split("T")[1]?.slice(0, 5) || "00:00";
}

export function composeDateTimeLocal(date: string, time: string): string {
  return `${date}T${time || "00:00"}`;
}

export function addMinutesToDateTimeLocal(value: string, minutes: number): string {
  try { return Temporal.PlainDateTime.from(value).add({ minutes }).toString({ smallestUnit: "minute" }); }
  catch { return value; }
}

export function ensureMinimumEventEndAt(startAt: string, endAt: string): string {
  const start = new Date(`${startAt}Z`);
  const end = new Date(`${endAt}Z`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end.getTime() - start.getTime() < CALENDAR_MIN_EVENT_DURATION_MS
  ) {
    return addMinutesToDateTimeLocal(
      startAt,
      CALENDAR_MIN_EVENT_DURATION_MS / 60_000,
    );
  }

  return endAt;
}

export function hasMinimumEventDuration(startAt: string, endAt: string): boolean {
  const start = new Date(`${startAt}Z`);
  const end = new Date(`${endAt}Z`);

  return (
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    end.getTime() - start.getTime() >= CALENDAR_MIN_EVENT_DURATION_MS
  );
}

export function formatCalendarEventRange(
  event: CalendarEvent,
  locale: string,
): string {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const isVi = locale.toLowerCase().startsWith("vi");
  const timeZone = event.allDay ? event.timeZone || event.calendar?.timeZone || getDisplayTimezone() : getDisplayTimezone();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  const sameDay = zonedDateKey(start, timeZone) === zonedDateKey(end, timeZone);

  const isCurrentYear = zonedDateKey(start, timeZone).slice(0, 4) === zonedDateKey(new Date(), timeZone).slice(0, 4);

  if (sameDay) {
    const datePart = start.toLocaleDateString(locale, {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      ...(isCurrentYear ? {} : { year: "numeric" }),
    });

    if (event.allDay) {
      return datePart;
    }

    const timeStart = start.toLocaleTimeString(locale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: !isVi,
    });
    const timeEnd = end.toLocaleTimeString(locale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: !isVi,
    });

    return `${datePart} • ${timeStart} – ${timeEnd}`;
  }

  const startStr = start.toLocaleString(locale, {
    timeZone,
    dateStyle: "medium",
    ...(event.allDay ? {} : { timeStyle: "short" }),
  });
  const endStr = end.toLocaleString(locale, {
    timeZone,
    dateStyle: "medium",
    ...(event.allDay ? {} : { timeStyle: "short" }),
  });

  return `${startStr} – ${endStr}`;
}

export function formatReminderLabel(minutesBefore: number): string {
  if (minutesBefore === 0) {
    return "At time of event";
  }
  return formatReminderOptionLabel(minutesBefore);
}

export function isSameDate(first?: Date | null, second?: Date | null) {
  if (!first || !second) return false;

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function getMiniCalendarWeekdayLabel(date: Date, locale: string) {
  if (locale.toLowerCase().startsWith("vi")) {
    const vietnameseLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return vietnameseLabels[date.getDay()];
  }

  return new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(date);
}
