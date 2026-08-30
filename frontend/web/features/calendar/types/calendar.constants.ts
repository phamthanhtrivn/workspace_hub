export const CALENDAR_DEFAULT_EVENT_COLOR = "#2563eb";
export const CALENDAR_DEFAULT_TASK_COLOR = "#4285f4";
export const CALENDAR_TASK_COLOR_STORAGE_KEY = "calendar.taskColor";
export const CALENDAR_DEFAULT_NAME = "Personal";
export const CALENDAR_DEFAULT_ICON = "📅";
export const CALENDAR_DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;
export const CALENDAR_MIN_EVENT_DURATION_MS = 15 * 60 * 1000;
export const CALENDAR_INITIAL_RANGE_LOOKBACK_DAYS = 14;
export const CALENDAR_INITIAL_RANGE_LOOKAHEAD_DAYS = 45;
export const CALENDAR_INITIAL_VIEW = "timeGridWeek";
export const CALENDAR_SLOT_MIN_TIME = "06:00:00";
export const CALENDAR_SLOT_MAX_TIME = "22:00:00";

export const CALENDAR_COLOR_CHOICES = [
  "#2563eb",
  "#0ea5e9",
  "#16a34a",
  "#22c55e",
  "#f59e0b",
  "#f97316",
  "#dc2626",
  "#ec4899",
  "#7c3aed",
  "#6366f1",
  "#64748b",
] as const;

export const CALENDAR_ICON_CHOICES = [
  "📅",
  "💼",
  "📚",
  "🎯",
  "🏋️",
  "🎂",
  "✈️",
  "🧠",
  "🛠️",
  "⭐",
  "🏠",
  "🎨",
  "💡",
  "🚀",
  "📝",
  "🏆",
] as const;

export const CALENDAR_VIEW_OPTIONS = [
  { value: "dayGridMonth", labelId: "calendar.view.month" },
  { value: "timeGridWeek", labelId: "calendar.view.week" },
  { value: "timeGridDay", labelId: "calendar.view.day" },
  { value: "listWeek", labelId: "calendar.view.list" },
] as const;

export const CALENDAR_REMINDER_OPTIONS = [
  { value: "0", labelId: "calendar.reminder.atTime" },
  { value: "5", labelId: "calendar.reminder.5m" },
  { value: "10", labelId: "calendar.reminder.10m" },
  { value: "30", labelId: "calendar.reminder.30m" },
  { value: "60", labelId: "calendar.reminder.1h" },
  { value: "1440", labelId: "calendar.reminder.1d" },
  { value: "custom", labelId: "calendar.reminder.custom" },
] as const;

export const CALENDAR_RECURRENCE_PRESET_VALUES = {
  NONE: "none",
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
  WEEKDAYS: "weekdays",
  CUSTOM: "custom",
} as const;

export const CALENDAR_RECURRENCE_FREQUENCY_OPTIONS = [
  { value: "DAILY", labelId: "calendar.recurrence.unit.day" },
  { value: "WEEKLY", labelId: "calendar.recurrence.unit.week" },
  { value: "MONTHLY", labelId: "calendar.recurrence.unit.month" },
  { value: "YEARLY", labelId: "calendar.recurrence.unit.year" },
] as const;

export const CALENDAR_RECURRENCE_WEEKDAY_OPTIONS = [
  { value: "MO", labelId: "calendar.weekday.mo" },
  { value: "TU", labelId: "calendar.weekday.tu" },
  { value: "WE", labelId: "calendar.weekday.we" },
  { value: "TH", labelId: "calendar.weekday.th" },
  { value: "FR", labelId: "calendar.weekday.fr" },
  { value: "SA", labelId: "calendar.weekday.sa" },
  { value: "SU", labelId: "calendar.weekday.su" },
] as const;
