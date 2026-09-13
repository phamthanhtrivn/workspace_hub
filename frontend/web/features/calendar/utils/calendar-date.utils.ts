import { CalendarEvent, EventSourceType } from "../types/calendar.types";
import { CALENDAR_MIN_EVENT_DURATION_MS } from "../types/calendar.constants";

export function toDateTimeLocal(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value: string): string {
  return new Date(value).toISOString();
}

export function isAllDayDateTimeRange(
  startValue: Date | string,
  endValue: Date | string,
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
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    start.getSeconds() === 0 &&
    end.getHours() === 23 &&
    end.getMinutes() === 59
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

export function getExclusiveAllDayEndDateKey(value: Date | string): string {
  const end = typeof value === "string" ? new Date(value) : new Date(value);
  if (Number.isNaN(end.getTime())) return "";

  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  return formatLocalDateKey(end);
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
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  date.setMinutes(date.getMinutes() + minutes);
  return toDateTimeLocal(date);
}

export function ensureMinimumEventEndAt(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);

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
  const start = new Date(startAt);
  const end = new Date(endAt);

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

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const isCurrentYear = start.getFullYear() === new Date().getFullYear();

  if (sameDay) {
    const datePart = start.toLocaleDateString(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      ...(isCurrentYear ? {} : { year: "numeric" }),
    });

    if (event.allDay) {
      return datePart;
    }

    const timeStart = start.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: !isVi,
    });
    const timeEnd = end.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: !isVi,
    });

    return `${datePart} • ${timeStart} – ${timeEnd}`;
  }

  const startStr = start.toLocaleString(locale, {
    dateStyle: "medium",
    ...(event.allDay ? {} : { timeStyle: "short" }),
  });
  const endStr = end.toLocaleString(locale, {
    dateStyle: "medium",
    ...(event.allDay ? {} : { timeStyle: "short" }),
  });

  return `${startStr} – ${endStr}`;
}

export function formatReminderLabel(
  minutesBefore: number,
  locale: string,
): string {
  const isVi = locale.toLowerCase().startsWith("vi");
  if (minutesBefore === 0) {
    return isVi ? "Đúng giờ sự kiện" : "At time of event";
  }
  if (minutesBefore < 60) {
    return isVi
      ? `${minutesBefore} phút trước`
      : `${minutesBefore} minutes before`;
  }
  if (minutesBefore < 1440) {
    const hours = Math.floor(minutesBefore / 60);
    return isVi
      ? `${hours} giờ trước`
      : `${hours} hour${hours > 1 ? "s" : ""} before`;
  }
  const days = Math.floor(minutesBefore / 1440);
  return isVi
    ? `${days} ngày trước`
    : `${days} day${days > 1 ? "s" : ""} before`;
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
