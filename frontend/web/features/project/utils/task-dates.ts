import { formatDateOnly, formatInTimezone, fromZonedDateTimeInput, getDisplayTimezone, toZonedDateTimeInput, zonedDateKey } from "@/lib/timezone";

export function taskDateKey(value?: string | null, allDay = false, timeZone = getDisplayTimezone()): string {
  if (!value) return "";
  if (allDay || value.length === 10) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) return value.slice(0, 10);
  return zonedDateKey(date, timeZone);
}

export function toDateTimeInput(value?: string | null, timeZone = getDisplayTimezone()): string {
  if (!value) return "";
  if (value.length === 10) return `${value}T09:00`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toZonedDateTimeInput(value, timeZone);
}

export function toApiDateTime(value: string, allDay: boolean): string | null {
  if (!value) return null;
  const date = new Date(allDay ? `${value.slice(0, 10)}T00:00:00.000Z` : fromZonedDateTimeInput(value));
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date format");
  return date.toISOString();
}

export function isTaskOverdue(task: { dueDate?: string | null; allDay: boolean }, now = new Date(), timeZone = getDisplayTimezone()): boolean {
  if (!task.dueDate) return false;
  return task.allDay ? taskDateKey(task.dueDate, true) < zonedDateKey(now, timeZone) : Date.parse(task.dueDate) < now.getTime();
}

export function formatSimpleDate(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    if (dateString.length === 10) return formatDateOnly(dateString, "en-US", { month: "short", day: "numeric" });
    return formatInTimezone(d, "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function formatTaskDateTime(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return formatInTimezone(d, "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}
