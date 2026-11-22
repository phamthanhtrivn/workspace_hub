import { Temporal } from "temporal-polyfill";
import { formatInTimezone, getDisplayTimezone, parseUtcDate, zonedDateKey } from "./timezone";

export function formatConversationTime(dateInput: string | number | Date, timeZone = getDisplayTimezone()): string {
  const date = parseUtcDate(dateInput);
  if (!Number.isFinite(date.getTime())) return "";
  const now = new Date();
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + "m ago";
  if (minutes < 24 * 60) return Math.floor(minutes / 60) + "h ago";
  if (minutes < 7 * 24 * 60) return Math.floor(minutes / (24 * 60)) + "d ago";
  const sameYear = zonedDateKey(date, timeZone).slice(0, 4) === zonedDateKey(now, timeZone).slice(0, 4);
  return formatInTimezone(date, "en-GB", { day: "2-digit", month: "2-digit", ...(sameYear ? {} : { year: "numeric" }) }, timeZone);
}

export const formatTimeAgo = formatConversationTime;

export function formatDateTime(dateInput?: string | number | Date | null, timeZone = getDisplayTimezone()): string {
  if (dateInput == null || dateInput === "") return "";
  const instant = parseUtcDate(dateInput);
  if (!Number.isFinite(instant.getTime())) return "";
  const date = Temporal.Instant.from(instant.toISOString()).toZonedDateTimeISO(timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.day)}/${pad(date.month)}/${date.year} ${pad(date.hour % 12 || 12)}:${pad(date.minute)} ${date.hour >= 12 ? "PM" : "AM"}`;
}

export function formatDividerTime(dateInput: string | number | Date, timeZone = getDisplayTimezone()): string {
  const date = parseUtcDate(dateInput);
  if (!Number.isFinite(date.getTime())) return "";
  const day = zonedDateKey(date, timeZone);
  const today = zonedDateKey(new Date(), timeZone);
  if (day === today) return "Today";
  if (day === Temporal.PlainDate.from(today).subtract({ days: 1 }).toString()) return "Yesterday";
  return `${formatInTimezone(date, "en-GB", { weekday: "long" }, timeZone)} ${formatInTimezone(date, "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }, timeZone)}`;
}
