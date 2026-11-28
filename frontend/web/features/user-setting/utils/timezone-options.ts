import {
  FALLBACK_TIMEZONE,
  isValidTimezone,
  timezoneLabel,
} from "@/lib/timezone";

export interface TimezoneOption {
  value: string;
  label: string;
}

export function timezoneOptions(
  current?: string,
  now = new Date(),
): TimezoneOption[] {
  const zones = new Set([
    FALLBACK_TIMEZONE,
    "UTC",
    ...Intl.supportedValuesOf("timeZone"),
    ...(isValidTimezone(current) ? [current] : []),
  ]);
  return [...zones].map((value) => ({
    value,
    label: timezoneLabel(value, now),
  }));
}

function normalizeTimezoneSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[_/\s]+/g, "")
    .replace(/([+-])0(?=\d)/g, "$1");
}

export function filterTimezoneOptions(
  options: TimezoneOption[],
  search: string,
): TimezoneOption[] {
  const query = normalizeTimezoneSearch(search);
  return query
    ? options.filter((option) =>
        normalizeTimezoneSearch(option.label).includes(query),
      )
    : options;
}
