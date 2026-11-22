import {
  composeDateTimeLocal,
  getDateInputValue,
  getTimeInputValue,
  hasMinimumEventDuration,
  addMinutesToDateTimeLocal,
} from "./calendar-date.utils";
import { Temporal } from "temporal-polyfill";

export interface CalendarTimeOption {
  value: string;
  label: string;
}

const QUARTER_HOUR_MINUTES = 15;
const MINUTES_PER_DAY = 24 * 60;
const GOOGLE_STYLE_DURATIONS = [
  30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480, 600, 720,
];

function formatTime(clock: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`2000-01-01T${clock}:00Z`));
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
    const clock = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    return {
      value: clock,
      label: formatTime(clock, locale),
    };
  });
}

export function createEndTimeOptions(
  startAt: string,
  currentEndAt: string,
  locale: string,
): CalendarTimeOption[] {
  const start = new Date(`${startAt}Z`);
  const currentEnd = new Date(`${currentEndAt}Z`);
  if (Number.isNaN(start.getTime())) return [];

  if (getDateInputValue(startAt) !== getDateInputValue(currentEndAt)) {
    const endDate = getDateInputValue(currentEndAt);
    return createStartTimeOptions(locale, getTimeInputValue(currentEndAt))
      .map((option) => {
        const value = composeDateTimeLocal(endDate, option.value);
        const minutes = Math.round(
          Temporal.PlainDateTime.from(startAt).until(Temporal.PlainDateTime.from(value)).total("minutes"),
        );
        return {
          value,
          label: `${option.label} (${formatDuration(minutes, locale)})`,
        };
      })
      .filter((option) => hasMinimumEventDuration(startAt, option.value));
  }

  const durations = [...GOOGLE_STYLE_DURATIONS];
  const currentDuration = Math.round(
    (currentEnd.getTime() - start.getTime()) / 60_000,
  );
  if (currentDuration > 0 && !durations.includes(currentDuration)) {
    durations.push(currentDuration);
    durations.sort((first, second) => first - second);
  }

  return durations.map((minutes) => {
    const end = addMinutesToDateTimeLocal(startAt, minutes);
    return {
      value: end,
      label: `${formatTime(getTimeInputValue(end), locale)} (${formatDuration(minutes, locale)})`,
    };
  }).filter(option => hasMinimumEventDuration(startAt, option.value));
}
