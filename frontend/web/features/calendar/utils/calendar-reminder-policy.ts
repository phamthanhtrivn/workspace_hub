import {
  ReminderMethod,
  type CalendarEventReminderPayload,
} from "../types/calendar.types";
import { REMINDER_PRESETS } from "./calendar-reminder.utils";
import {
  CALENDAR_DEFAULT_REMINDER_MINUTES,
  CALENDAR_MAX_REMINDER_MINUTES_BEFORE,
} from "../types/calendar.constants";

export function isDuplicateReminder(
  reminders: CalendarEventReminderPayload[],
  candidate: CalendarEventReminderPayload,
  excludedIndex = -1,
) {
  return reminders.some(
    (reminder, index) =>
      index !== excludedIndex &&
      reminder.method === candidate.method &&
      reminder.minutesBefore === candidate.minutesBefore,
  );
}

export function nextAvailableReminder(
  reminders: CalendarEventReminderPayload[],
): CalendarEventReminderPayload {
  const method = ReminderMethod.ALERT;
  for (const minutesBefore of [
    CALENDAR_DEFAULT_REMINDER_MINUTES,
    ...REMINDER_PRESETS.map((preset) => preset.value),
  ]) {
    if (!isDuplicateReminder(reminders, { method, minutesBefore }))
      return { method, minutesBefore };
  }
  for (
    let minutesBefore = 0;
    minutesBefore <= CALENDAR_MAX_REMINDER_MINUTES_BEFORE;
    minutesBefore++
  ) {
    if (!isDuplicateReminder(reminders, { method, minutesBefore }))
      return { method, minutesBefore };
  }
  throw new Error("No available reminder time");
}
