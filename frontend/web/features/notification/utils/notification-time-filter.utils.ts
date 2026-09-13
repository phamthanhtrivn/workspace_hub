import type {
  NotificationDateRange,
  NotificationTimeFilter,
} from "../types/notification.types";

export interface NotificationDateRangeOptions {
  now?: Date;
  customFromDate?: string;
  customToDate?: string;
}

export const NOTIFICATION_TIME_FILTERS: NotificationTimeFilter[] = [
  "ALL_TIME",
  "TODAY",
  "LAST_7_DAYS",
  "LAST_30_DAYS",
  "THIS_MONTH",
  "CUSTOM_RANGE",
];

export function getNotificationDateRange(
  filter: NotificationTimeFilter,
  options: NotificationDateRangeOptions = {},
): NotificationDateRange {
  const now = options.now ? new Date(options.now) : new Date();

  if (filter === "ALL_TIME") {
    return {};
  }

  if (filter === "TODAY") {
    return {
      fromDate: startOfLocalDay(now).toISOString(),
      toDate: now.toISOString(),
    };
  }

  if (filter === "LAST_7_DAYS") {
    return {
      fromDate: shiftLocalDays(now, -7).toISOString(),
      toDate: now.toISOString(),
    };
  }

  if (filter === "LAST_30_DAYS") {
    return {
      fromDate: shiftLocalDays(now, -30).toISOString(),
      toDate: now.toISOString(),
    };
  }

  if (filter === "THIS_MONTH") {
    return {
      fromDate: startOfLocalMonth(now).toISOString(),
      toDate: now.toISOString(),
    };
  }

  const fromDate = parseLocalDateInput(options.customFromDate, "start");
  const toDate = parseLocalDateInput(options.customToDate, "end");

  return {
    fromDate: fromDate?.toISOString(),
    toDate: toDate?.toISOString(),
  };
}

export function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfLocalMonth(date: Date): Date {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function shiftLocalDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function parseLocalDateInput(
  value: string | undefined,
  boundary: "start" | "end",
): Date | undefined {
  if (!value) return undefined;
  const parts = value.split("-").map(Number);
  const [year, month, day] = parts;

  if (!year || !month || !day) return undefined;

  const date = new Date(year, month - 1, day);
  if (boundary === "start") {
    date.setHours(0, 0, 0, 0);
  } else {
    date.setHours(23, 59, 59, 999);
  }
  return date;
}
