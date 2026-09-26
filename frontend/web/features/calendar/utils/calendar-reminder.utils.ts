import { CALENDAR_FORM_COPY } from "../constants/calendar-form-copy";

export const REMINDER_PRESETS = [
  { value: 0, label: "At start" },
  { value: 1, label: "1 min" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
] as const;

export const REMINDER_UNIT_MINUTES = {
  minutes: 1,
  hours: 60,
  days: 24 * 60,
  weeks: 7 * 24 * 60,
} as const;

export type ReminderUnit = keyof typeof REMINDER_UNIT_MINUTES;

export function isReminderPreset(minutesBefore: number): boolean {
  return REMINDER_PRESETS.some((preset) => preset.value === minutesBefore);
}

export function getCustomReminderParts(minutesBefore: number): {
  amount: number;
  unit: ReminderUnit;
} {
  const safeMinutes = Math.max(0, Math.floor(Number(minutesBefore) || 0));
  for (const unit of ["weeks", "days", "hours"] as const) {
    const factor = REMINDER_UNIT_MINUTES[unit];
    if (safeMinutes > 0 && safeMinutes % factor === 0) {
      return { amount: safeMinutes / factor, unit };
    }
  }
  return { amount: safeMinutes, unit: "minutes" };
}

export function toReminderMinutes(amount: string, unit: ReminderUnit): number {
  if (amount.trim() === "") return Number.NaN;
  const parsedAmount = Number(amount);
  if (!Number.isInteger(parsedAmount) || parsedAmount < 0) return Number.NaN;
  return parsedAmount * REMINDER_UNIT_MINUTES[unit];
}

export function formatReminderOptionLabel(minutesBefore: number): string {
  const safeMinutes = Math.max(0, Math.floor(Number(minutesBefore) || 0));
  if (safeMinutes === 0) return "at start";

  const parts = getCustomReminderParts(safeMinutes);
  const amount = parts.amount;
  const unitLabel = amount === 1 ? parts.unit.replace(/s$/, "") : parts.unit;
  return `${amount} ${unitLabel} before`;
}

export function formatReminderSummary(
  reminders?: Array<{ minutesBefore: number } | number> | null,
): string {
  if (!reminders || reminders.length === 0) {
    return CALENDAR_FORM_COPY.noReminders;
  }
  if (reminders.length === 1) {
    const item = reminders[0];
    const minutesBefore =
      typeof item === "number"
        ? item
        : typeof item === "object" && item !== null
          ? Number(item.minutesBefore ?? 0)
          : 0;
    const label = formatReminderOptionLabel(minutesBefore);
    return CALENDAR_FORM_COPY.notifyBefore(label);
  }
  return CALENDAR_FORM_COPY.reminderCount(reminders.length);
}
