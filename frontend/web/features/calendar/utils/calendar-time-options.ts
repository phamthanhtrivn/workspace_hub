import { toDateTimeLocal } from "./calendar-date.utils";

export interface CalendarTimeOption {
  value: string;
  label: string;
}

const QUARTER_HOUR_MINUTES = 15;
const MINUTES_PER_DAY = 24 * 60;
const GOOGLE_STYLE_DURATIONS = [
  30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480, 600, 720,
];

function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDuration(minutes: number, locale: string): string {
  const vietnamese = locale.toLowerCase().startsWith("vi");
  if (minutes < 60) return `${minutes} ${vietnamese ? "phút" : "mins"}`;

  const hours = minutes / 60;
  const formattedHours = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(hours);

  if (vietnamese) return `${formattedHours} giờ`;
  return `${formattedHours} ${hours === 1 ? "hr" : "hrs"}`;
}

export function createStartTimeOptions(
  locale: string,
  currentTime?: string,
): CalendarTimeOption[] {
  const values = Array.from(
    { length: MINUTES_PER_DAY / QUARTER_HOUR_MINUTES },
    (_, index) => index * QUARTER_HOUR_MINUTES,
  );
  const currentMinutes = currentTime
    ? Number(currentTime.slice(0, 2)) * 60 + Number(currentTime.slice(3, 5))
    : Number.NaN;

  if (Number.isFinite(currentMinutes) && !values.includes(currentMinutes)) {
    values.push(currentMinutes);
    values.sort((first, second) => first - second);
  }

  return values.map((minutes) => {
    const date = new Date(2000, 0, 1, 0, minutes);
    return {
      value: `${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes(),
      ).padStart(2, "0")}`,
      label: formatTime(date, locale),
    };
  });
}

export function createEndTimeOptions(
  startAt: string,
  currentEndAt: string,
  locale: string,
): CalendarTimeOption[] {
  const start = new Date(startAt);
  const currentEnd = new Date(currentEndAt);
  if (Number.isNaN(start.getTime())) return [];

  const durations = [...GOOGLE_STYLE_DURATIONS];
  const currentDuration = Math.round(
    (currentEnd.getTime() - start.getTime()) / 60_000,
  );
  if (currentDuration > 0 && !durations.includes(currentDuration)) {
    durations.push(currentDuration);
    durations.sort((first, second) => first - second);
  }

  return durations.map((minutes) => {
    const end = new Date(start.getTime() + minutes * 60_000);
    return {
      value: toDateTimeLocal(end),
      label: `${formatTime(end, locale)} (${formatDuration(minutes, locale)})`,
    };
  });
}
