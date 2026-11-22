import { Temporal } from "temporal-polyfill";
import { getDisplayTimezone, zonedDateKey, zonedDayBounds } from "@/lib/timezone";
import type { NotificationDateRange, NotificationTimeFilter } from "../types/notification.types";

export interface NotificationDateRangeOptions {
  now?: Date;
  customFromDate?: string;
  customToDate?: string;
  timeZone?: string;
}
export const NOTIFICATION_TIME_FILTERS: NotificationTimeFilter[] = ["ALL_TIME", "TODAY", "LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "CUSTOM_RANGE"];

export function getNotificationDateRange(filter: NotificationTimeFilter, options: NotificationDateRangeOptions = {}): NotificationDateRange {
  if (filter === "ALL_TIME") return {};
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? getDisplayTimezone();
  const today = zonedDateKey(now, timeZone);
  if (filter === "TODAY") return { fromDate: zonedDayBounds(today, timeZone).startAt, toDate: now.toISOString() };
  if (filter === "THIS_MONTH") return { fromDate: zonedDayBounds(today.slice(0, 7) + "-01", timeZone).startAt, toDate: now.toISOString() };
  if (filter === "LAST_7_DAYS" || filter === "LAST_30_DAYS") {
    const from = Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(timeZone).subtract({ days: filter === "LAST_7_DAYS" ? 7 : 30 });
    return { fromDate: from.toInstant().toString({ smallestUnit: "millisecond" }), toDate: now.toISOString() };
  }
  const boundary = (value: string | undefined, end: boolean) => {
    if (!value) return undefined;
    try {
      const bounds = zonedDayBounds(value, timeZone);
      return end ? new Date(Date.parse(bounds.endAt) - 1).toISOString() : bounds.startAt;
    } catch { return undefined; }
  };
  return { fromDate: boundary(options.customFromDate, false), toDate: boundary(options.customToDate, true) };
}
export function toLocalDateInputValue(date: Date, timeZone = getDisplayTimezone()): string {
  return zonedDateKey(date, timeZone);
}
