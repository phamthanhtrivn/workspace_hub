import {
  CALENDAR_RECURRENCE_PRESET_VALUES,
} from "../types/calendar.constants";
import {
  CalendarCustomRecurrence,
  CalendarRecurrenceFrequency,
  CalendarRecurrenceWeekday,
} from "../types/calendar.types";

export type CalendarRecurrencePreset =
  (typeof CALENDAR_RECURRENCE_PRESET_VALUES)[keyof typeof CALENDAR_RECURRENCE_PRESET_VALUES];

const weekdayCodes: CalendarRecurrenceWeekday[] = [
  "SU",
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
];

const frequencyByUnit: Record<CalendarRecurrenceFrequency, string> = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
};

export function getWeekdayCode(date: Date): CalendarRecurrenceWeekday {
  return weekdayCodes[date.getDay()];
}

export function getWeekdayName(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
}

export function getMonthDayName(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getPresetRecurrenceRule(
  preset: CalendarRecurrencePreset,
  startDate: Date,
): string | null {
  switch (preset) {
    case CALENDAR_RECURRENCE_PRESET_VALUES.DAILY:
      return "FREQ=DAILY;INTERVAL=1";
    case CALENDAR_RECURRENCE_PRESET_VALUES.WEEKLY:
      return `FREQ=WEEKLY;INTERVAL=1;BYDAY=${getWeekdayCode(startDate)}`;
    case CALENDAR_RECURRENCE_PRESET_VALUES.MONTHLY:
      return "FREQ=MONTHLY;INTERVAL=1";
    case CALENDAR_RECURRENCE_PRESET_VALUES.YEARLY:
      return "FREQ=YEARLY;INTERVAL=1";
    case CALENDAR_RECURRENCE_PRESET_VALUES.WEEKDAYS:
      return "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR";
    default:
      return null;
  }
}

export function buildCustomRecurrenceRule(
  recurrence: CalendarCustomRecurrence,
): string {
  const parts = [
    `FREQ=${frequencyByUnit[recurrence.frequency]}`,
    `INTERVAL=${Math.max(1, recurrence.interval)}`,
  ];

  if (
    recurrence.frequency === "WEEKLY" &&
    recurrence.weekdays.length > 0
  ) {
    parts.push(`BYDAY=${recurrence.weekdays.join(",")}`);
  }

  if (recurrence.endType === "on" && recurrence.until) {
    parts.push(`UNTIL=${recurrence.until.replaceAll("-", "")}`);
  }

  if (recurrence.endType === "after" && recurrence.count) {
    parts.push(`COUNT=${Math.max(1, recurrence.count)}`);
  }

  return parts.join(";");
}

export function parseCustomRecurrenceRule(
  rule?: string | null,
  startDate?: Date,
): CalendarCustomRecurrence {
  const fallback: CalendarCustomRecurrence = {
    interval: 1,
    frequency: "WEEKLY",
    weekdays: startDate ? [getWeekdayCode(startDate)] : ["MO"],
    endType: "never",
  };

  if (!rule) return fallback;

  const entries = Object.fromEntries(
    rule.split(";").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  const frequency = (entries.FREQ as CalendarRecurrenceFrequency) || "WEEKLY";
  const weekdays = entries.BYDAY
    ? (entries.BYDAY.split(",") as CalendarRecurrenceWeekday[])
    : fallback.weekdays;

  return {
    interval: Math.max(1, Number(entries.INTERVAL) || 1),
    frequency,
    weekdays,
    endType: entries.COUNT ? "after" : entries.UNTIL ? "on" : "never",
    until: entries.UNTIL
      ? `${entries.UNTIL.slice(0, 4)}-${entries.UNTIL.slice(
          4,
          6,
        )}-${entries.UNTIL.slice(6, 8)}`
      : undefined,
    count: entries.COUNT ? Math.max(1, Number(entries.COUNT) || 1) : undefined,
  };
}

export function getRecurrencePresetFromRule(
  rule?: string | null,
  startDate?: Date,
): CalendarRecurrencePreset {
  if (!rule) return CALENDAR_RECURRENCE_PRESET_VALUES.NONE;

  const presets = [
    CALENDAR_RECURRENCE_PRESET_VALUES.DAILY,
    CALENDAR_RECURRENCE_PRESET_VALUES.WEEKLY,
    CALENDAR_RECURRENCE_PRESET_VALUES.MONTHLY,
    CALENDAR_RECURRENCE_PRESET_VALUES.YEARLY,
    CALENDAR_RECURRENCE_PRESET_VALUES.WEEKDAYS,
  ];

  return (
    presets.find(
      (preset) =>
        getPresetRecurrenceRule(preset, startDate || new Date()) === rule,
    ) || CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM
  );
}
