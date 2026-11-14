export const DATE_RANGE_MESSAGES = {
  startInPast: "Start date must be today or later.",
  startRequired: "Select a start date first.",
  endRequired: "Select an end date.",
  invalidDate: "Choose a valid date and time.",
  endBeforeStart: "End date cannot be before start date.",
} as const;

export interface DateRangeOptions {
  start: string;
  end: string;
  mode: "create" | "edit";
  dateOnly?: boolean;
  today?: string;
  allowPastStart?: boolean;
  requireStart?: boolean;
  requireEnd?: boolean;
  minDurationMs?: number;
  allowExistingEndWithoutStart?: boolean;
}

export interface DateRangeErrors { start?: string; end?: string }

export function getTodayDateValue(now = new Date(), timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(entry => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function rangeTimestamp(value: string, dateOnly: boolean): number {
  return new Date(dateOnly ? `${value.slice(0, 10)}T00:00` : value).getTime();
}

export function getDateRangeErrors({
  start, end, mode, dateOnly = false, today = getTodayDateValue(),
  requireStart = false, requireEnd = false, minDurationMs = 0,
  allowExistingEndWithoutStart = false, allowPastStart = false,
}: DateRangeOptions): DateRangeErrors {
  const errors: DateRangeErrors = {};
  if (!start) {
    if (requireStart) errors.start = DATE_RANGE_MESSAGES.startRequired;
    if (end && !allowExistingEndWithoutStart) errors.end = DATE_RANGE_MESSAGES.startRequired;
  } else if (!Number.isFinite(rangeTimestamp(start, dateOnly))) {
    errors.start = DATE_RANGE_MESSAGES.invalidDate;
  } else if (
    mode === "create" &&
    !allowPastStart &&
    start.slice(0, 10) < today
  ) {
    errors.start = DATE_RANGE_MESSAGES.startInPast;
  }
  if (!end) {
    if (requireEnd) errors.end = DATE_RANGE_MESSAGES.endRequired;
  } else if (!Number.isFinite(rangeTimestamp(end, dateOnly))) {
    errors.end = DATE_RANGE_MESSAGES.invalidDate;
  } else if (start && !errors.start) {
    const duration = rangeTimestamp(end, dateOnly) - rangeTimestamp(start, dateOnly);
    if (duration < 0) errors.end = DATE_RANGE_MESSAGES.endBeforeStart;
    else if (!dateOnly && duration < minDurationMs) {
      errors.end = `End time must be at least ${minDurationMs / 60_000} minutes after start time.`;
    }
  }
  return errors;
}

export function hasDateRangeErrors(errors: DateRangeErrors): boolean {
  return Boolean(errors.start || errors.end);
}

function offsetDateTime(value: string, offsetMs: number): string | undefined {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  date.setTime(date.getTime() + offsetMs);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function getDateRangeBounds({ start, end, mode, dateOnly = false,
  today = getTodayDateValue(), minDurationMs = 0, allowPastStart = false }: DateRangeOptions) {
  const startMin = mode === "create" && !allowPastStart
    ? dateOnly ? today : `${today}T00:00`
    : undefined;
  const startMax = end ? dateOnly ? end : offsetDateTime(end, -minDurationMs) : undefined;
  return {
    startMin,
    // A stale end date must not leave the calendar with an empty navigable range.
    startMax: startMin && startMax && startMax < startMin ? undefined : startMax,
    endMin: start ? dateOnly ? start : offsetDateTime(start, minDurationMs) : undefined,
  };
}

/** Preserve the selected/default clock time, replacing only a past date. */
export function getInitialScheduleStart(value: string, dateOnly = false): string {
  const today = getTodayDateValue();
  const candidate = value || (dateOnly ? today : `${today}T09:00`);
  const start = candidate.slice(0, 10) < today ? today + candidate.slice(10) : candidate;
  return dateOnly ? start.slice(0, 10) : start;
}
