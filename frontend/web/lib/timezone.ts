import { Temporal } from "temporal-polyfill";

export const FALLBACK_TIMEZONE = "Asia/Ho_Chi_Minh";
export const CLOCK_REFRESH_MS = 1_000;
export const TIMEZONE_ERROR =
  "Choose a valid time in this timezone. This time may be skipped by a daylight saving change.";

export function isValidTimezone(value?: string | null): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimezone(preference?: string | null): string {
  return isValidTimezone(preference) ? preference : FALLBACK_TIMEZONE;
}

// Client preference only. Never persist a user's preference in a server singleton.
let browserTimezone: string | undefined;
const listeners = new Set<() => void>();
export function getDisplayTimezone(): string {
  return typeof window === "undefined"
    ? FALLBACK_TIMEZONE
    : browserTimezone || FALLBACK_TIMEZONE;
}
export function setDisplayTimezone(preference?: string | null): void {
  if (typeof window === "undefined") return;
  const next = resolveTimezone(preference);
  if (browserTimezone === next) return;
  browserTimezone = next;
  listeners.forEach((listener) => listener());
}
export function subscribeDisplayTimezone(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Legacy UTC API timestamps may omit the offset; local form values use a separate parser. */
export function parseUtcDate(value: string | number | Date): Date {
  return new Date(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)
      ? `${value}Z`
      : value,
  );
}

function instant(value: string | number | Date) {
  return Temporal.Instant.from(parseUtcDate(value).toISOString());
}

export function zonedDateKey(
  value: string | number | Date = new Date(),
  timeZone = getDisplayTimezone(),
): string {
  return instant(value).toZonedDateTimeISO(timeZone).toPlainDate().toString();
}

export function toZonedDateTimeInput(
  value: string | number | Date,
  timeZone = getDisplayTimezone(),
): string {
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)
  )
    return value.slice(0, 16);
  if (!Number.isFinite(new Date(value).getTime())) return "";
  return instant(value)
    .toZonedDateTimeISO(timeZone)
    .toPlainDateTime()
    .toString({ smallestUnit: "minute" });
}

export function fromZonedDateTimeInput(
  value: string,
  timeZone = getDisplayTimezone(),
  originalInstant?: string | null,
): string {
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(value))
    return new Date(value).toISOString();
  if (
    originalInstant &&
    toZonedDateTimeInput(originalInstant, timeZone) === value.slice(0, 16)
  )
    return parseUtcDate(originalInstant).toISOString();
  const wall = Temporal.PlainDateTime.from(value);
  const zoned = wall.toZonedDateTime(timeZone, {
    disambiguation: "compatible",
  });
  if (!zoned.toPlainDateTime().equals(wall))
    throw new RangeError(TIMEZONE_ERROR);
  return zoned.toInstant().toString({ smallestUnit: "millisecond" });
}

export function zonedDayBounds(date: string, timeZone = getDisplayTimezone()) {
  const day = Temporal.PlainDate.from(date);
  return {
    startAt: day
      .toZonedDateTime(timeZone)
      .toInstant()
      .toString({ smallestUnit: "millisecond" }),
    endAt: day
      .add({ days: 1 })
      .toZonedDateTime(timeZone)
      .toInstant()
      .toString({ smallestUnit: "millisecond" }),
  };
}

/** Date-only domain values (birthdays, all-day dates) must never change calendar day. */
export function formatDateOnly(
  value: string,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

export function formatInTimezone(
  value: string | number | Date,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = {},
  timeZone = getDisplayTimezone(),
): string {
  const date = parseUtcDate(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date)
    : "";
}

export function timezoneOffsetLabel(
  timeZone: string,
  now = new Date(),
): string {
  const offset =
    new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")
      ?.value.replace("GMT", "UTC") || "UTC";
  return offset === "UTC" ? "UTC+00:00" : offset;
}

export function timezoneLabel(timeZone: string, now = new Date()): string {
  return `${timeZone} (${timezoneOffsetLabel(timeZone, now)})`;
}
