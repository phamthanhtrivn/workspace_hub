import { Frequency, RRule, Weekday } from "rrule";
import { CALENDAR_RECURRENCE_PRESET_VALUES } from "../types/calendar.constants";
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

const weekdayByCode: Record<CalendarRecurrenceWeekday, Weekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

const frequencyByUnit: Record<CalendarRecurrenceFrequency, Frequency> = {
  DAILY: RRule.DAILY,
  WEEKLY: RRule.WEEKLY,
  MONTHLY: RRule.MONTHLY,
  YEARLY: RRule.YEARLY,
};

const unitByFrequency: Partial<Record<Frequency, CalendarRecurrenceFrequency>> = {
  [RRule.DAILY]: "DAILY",
  [RRule.WEEKLY]: "WEEKLY",
  [RRule.MONTHLY]: "MONTHLY",
  [RRule.YEARLY]: "YEARLY",
};

function serializeRule(options: ConstructorParameters<typeof RRule>[0]): string {
  const serialized = new RRule(options).toString();
  const ruleLine = serialized
    .split("\n")
    .find((line) => line.startsWith("RRULE:"));

  return (ruleLine || serialized).replace(/^RRULE:/, "");
}

function parseRule(rule: string) {
  return RRule.parseString(rule.replace(/^RRULE:/, ""));
}

function getParsedWeekdays(
  byweekday: ReturnType<typeof parseRule>["byweekday"],
): CalendarRecurrenceWeekday[] {
  const values =
    byweekday == null
      ? []
      : Array.isArray(byweekday)
        ? byweekday
        : [byweekday];

  return values
    .map((value) => String(value).slice(0, 2))
    .filter((value): value is CalendarRecurrenceWeekday =>
      Object.hasOwn(weekdayByCode, value),
    );
}

function toUntilDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
}

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
      return serializeRule({ freq: RRule.DAILY, interval: 1 });
    case CALENDAR_RECURRENCE_PRESET_VALUES.WEEKLY:
      return serializeRule({
        freq: RRule.WEEKLY,
        interval: 1,
        byweekday: weekdayByCode[getWeekdayCode(startDate)],
      });
    case CALENDAR_RECURRENCE_PRESET_VALUES.MONTHLY:
      return serializeRule({ freq: RRule.MONTHLY, interval: 1 });
    case CALENDAR_RECURRENCE_PRESET_VALUES.YEARLY:
      return serializeRule({ freq: RRule.YEARLY, interval: 1 });
    case CALENDAR_RECURRENCE_PRESET_VALUES.WEEKDAYS:
      return serializeRule({
        freq: RRule.WEEKLY,
        interval: 1,
        byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
      });
    default:
      return null;
  }
}

export function buildCustomRecurrenceRule(
  recurrence: CalendarCustomRecurrence,
): string {
  return serializeRule({
    freq: frequencyByUnit[recurrence.frequency],
    interval: Math.max(1, recurrence.interval),
    byweekday:
      recurrence.frequency === "WEEKLY" && recurrence.weekdays.length > 0
        ? recurrence.weekdays.map((weekday) => weekdayByCode[weekday])
        : undefined,
    until:
      recurrence.endType === "on" && recurrence.until
        ? toUntilDate(recurrence.until)
        : undefined,
    count:
      recurrence.endType === "after" && recurrence.count
        ? Math.max(1, recurrence.count)
        : undefined,
  });
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

  try {
    const parsed = parseRule(rule);
    const frequency =
      parsed.freq == null
        ? fallback.frequency
        : unitByFrequency[parsed.freq] || fallback.frequency;
    const weekdays = getParsedWeekdays(parsed.byweekday);

    return {
      interval: Math.max(1, parsed.interval || 1),
      frequency,
      weekdays: weekdays.length > 0 ? weekdays : fallback.weekdays,
      endType: parsed.count ? "after" : parsed.until ? "on" : "never",
      until: parsed.until?.toISOString().slice(0, 10),
      count: parsed.count ? Math.max(1, parsed.count) : undefined,
    };
  } catch {
    return fallback;
  }
}

export function getRecurrencePresetFromRule(
  rule?: string | null,
  startDate?: Date,
): CalendarRecurrencePreset {
  if (!rule) return CALENDAR_RECURRENCE_PRESET_VALUES.NONE;

  try {
    const parsed = parseRule(rule);
    const interval = parsed.interval || 1;
    const weekdays = getParsedWeekdays(parsed.byweekday);
    const hasCustomEnd = Boolean(parsed.count || parsed.until);

    if (interval !== 1 || hasCustomEnd) {
      return CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM;
    }

    if (parsed.freq === RRule.DAILY) {
      return CALENDAR_RECURRENCE_PRESET_VALUES.DAILY;
    }

    if (parsed.freq === RRule.MONTHLY && weekdays.length === 0) {
      return CALENDAR_RECURRENCE_PRESET_VALUES.MONTHLY;
    }

    if (parsed.freq === RRule.YEARLY && weekdays.length === 0) {
      return CALENDAR_RECURRENCE_PRESET_VALUES.YEARLY;
    }

    if (parsed.freq === RRule.WEEKLY) {
      const workdays: CalendarRecurrenceWeekday[] = [
        "MO",
        "TU",
        "WE",
        "TH",
        "FR",
      ];
      if (
        weekdays.length === workdays.length &&
        workdays.every((weekday) => weekdays.includes(weekday))
      ) {
        return CALENDAR_RECURRENCE_PRESET_VALUES.WEEKDAYS;
      }

      const expectedWeekday = getWeekdayCode(startDate || new Date());
      if (weekdays.length === 1 && weekdays[0] === expectedWeekday) {
        return CALENDAR_RECURRENCE_PRESET_VALUES.WEEKLY;
      }
    }
  } catch {
    return CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM;
  }

  return CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM;
}

const WEEKDAY_ORDER: CalendarRecurrenceWeekday[] = [
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
  "SU",
];

export function getWeekdayNameByCode(
  code: CalendarRecurrenceWeekday,
  locale: string,
): string {
  const offset = weekdayCodes.indexOf(code);
  const targetDate = new Date(Date.UTC(2026, 0, 4 + (offset >= 0 ? offset : 0)));
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(targetDate);
}

export function formatRecurrenceRuleText(
  rule?: string | null,
  locale = "vi",
  startDateInput?: Date | string | null,
): string | null {
  if (!rule) return null;

  try {
    const parsed = parseRule(rule);
    const isVi = locale.toLowerCase().startsWith("vi");
    const interval = Math.max(1, parsed.interval || 1);
    let weekdays = getParsedWeekdays(parsed.byweekday);

    const startDate = startDateInput
      ? typeof startDateInput === "string"
        ? new Date(startDateInput)
        : startDateInput
      : undefined;
    const validStartDate =
      startDate && !Number.isNaN(startDate.getTime()) ? startDate : undefined;

    let baseText = "";

    if (parsed.freq === RRule.DAILY) {
      if (interval === 1) {
        baseText = isVi ? "Hàng ngày" : "Daily";
      } else {
        baseText = isVi ? `Mỗi ${interval} ngày` : `Every ${interval} days`;
      }
    } else if (parsed.freq === RRule.WEEKLY) {
      const workdays: CalendarRecurrenceWeekday[] = [
        "MO",
        "TU",
        "WE",
        "TH",
        "FR",
      ];
      const isWorkdays =
        interval === 1 &&
        weekdays.length === 5 &&
        workdays.every((w) => weekdays.includes(w));

      if (isWorkdays) {
        baseText = isVi
          ? "Mọi ngày trong tuần (từ Thứ Hai đến Thứ Sáu)"
          : "Every weekday (Monday to Friday)";
      } else {
        if (weekdays.length === 0 && validStartDate) {
          weekdays = [getWeekdayCode(validStartDate)];
        }

        const sortedWeekdays = [...weekdays].sort(
          (a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b),
        );
        const dayNames = sortedWeekdays.map((c) =>
          getWeekdayNameByCode(c, locale),
        );

        if (dayNames.length === 1) {
          if (interval === 1) {
            baseText = isVi
              ? `Hàng tuần vào ${dayNames[0]}`
              : `Weekly on ${dayNames[0]}`;
          } else {
            baseText = isVi
              ? `Mỗi ${interval} tuần vào ${dayNames[0]}`
              : `Every ${interval} weeks on ${dayNames[0]}`;
          }
        } else if (dayNames.length > 1) {
          const joinedDays = dayNames.join(", ");
          if (interval === 1) {
            baseText = isVi
              ? `Hàng tuần vào các ngày ${joinedDays}`
              : `Weekly on ${joinedDays}`;
          } else {
            baseText = isVi
              ? `Mỗi ${interval} tuần vào ${joinedDays}`
              : `Every ${interval} weeks on ${joinedDays}`;
          }
        } else {
          baseText =
            interval === 1
              ? isVi
                ? "Hàng tuần"
                : "Weekly"
              : isVi
                ? `Mỗi ${interval} tuần`
                : `Every ${interval} weeks`;
        }
      }
    } else if (parsed.freq === RRule.MONTHLY) {
      const day = validStartDate ? validStartDate.getDate() : undefined;
      if (interval === 1) {
        baseText = day
          ? isVi
            ? `Hàng tháng vào ngày ${day}`
            : `Monthly on day ${day}`
          : isVi
            ? "Hàng tháng"
            : "Monthly";
      } else {
        baseText = day
          ? isVi
            ? `Mỗi ${interval} tháng vào ngày ${day}`
            : `Every ${interval} months on day ${day}`
          : isVi
            ? `Mỗi ${interval} tháng`
            : `Every ${interval} months`;
      }
    } else if (parsed.freq === RRule.YEARLY) {
      const monthDay = validStartDate
        ? new Intl.DateTimeFormat(locale, {
            month: "long",
            day: "numeric",
          }).format(validStartDate)
        : undefined;

      if (interval === 1) {
        baseText = monthDay
          ? isVi
            ? `Hàng năm vào ${monthDay}`
            : `Annually on ${monthDay}`
          : isVi
            ? "Hàng năm"
            : "Annually";
      } else {
        baseText = monthDay
          ? isVi
            ? `Mỗi ${interval} năm vào ${monthDay}`
            : `Every ${interval} years on ${monthDay}`
          : isVi
            ? `Mỗi ${interval} năm`
            : `Every ${interval} years`;
      }
    } else {
      baseText = isVi ? "Lặp lại định kỳ" : "Recurring";
    }

    if (parsed.count) {
      baseText += isVi ? `, ${parsed.count} lần` : `, ${parsed.count} times`;
    } else if (parsed.until) {
      const formattedUntil = new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(parsed.until);
      baseText += isVi
        ? `, đến ${formattedUntil}`
        : `, until ${formattedUntil}`;
    }

    return baseText;
  } catch {
    return null;
  }
}

