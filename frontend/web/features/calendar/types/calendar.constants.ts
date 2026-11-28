export const CALENDAR_DEFAULT_EVENT_COLOR = "#2563eb";
export const CALENDAR_DEFAULT_TASK_COLOR = "#4285f4";
export const CALENDAR_TASK_COLOR_STORAGE_KEY = "calendar.taskColor";
export const CALENDAR_SHOW_COMPLETED_STORAGE_KEY = "calendar.showCompletedTasks";
export const CALENDAR_DEFAULT_NAME = "Personal";
export const CALENDAR_DEFAULT_ICON = "📅";
export const CALENDAR_DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;
export const CALENDAR_MIN_EVENT_DURATION_MS = 15 * 60 * 1000;
export const CALENDAR_TASK_TITLE_MAX_LENGTH = 200;
export const CALENDAR_MAX_REMINDERS = 5;
export const CALENDAR_DEFAULT_REMINDER_MINUTES = 10;
export const CALENDAR_MAX_RECURRENCE_INTERVAL = 365;
export const CALENDAR_MAX_RECURRENCE_COUNT = 10_000;
export const CALENDAR_MAX_REMINDER_MINUTES_BEFORE = 30 * 24 * 60;
export const CALENDAR_INITIAL_RANGE_LOOKBACK_DAYS = 14;
export const CALENDAR_INITIAL_RANGE_LOOKAHEAD_DAYS = 45;
export const CALENDAR_INITIAL_VIEW = "timeGridWeek";
export const CALENDAR_SLOT_MIN_TIME = "00:00:00";
export const CALENDAR_SLOT_MAX_TIME = "24:00:00";

export {
  WORKSPACE_COLOR_OPTIONS as CALENDAR_COLOR_CHOICES,
  WORKSPACE_ICON_OPTIONS as CALENDAR_ICON_CHOICES,
} from "@/components/ui/custom/appearance.constants";

export const CALENDAR_VIEW_OPTIONS = [
  { value: "listYear", label: "Year" },
  { value: "dayGridMonth", label: "Month" },
  { value: "timeGridWeek", label: "Week" },
  { value: "timeGridDay", label: "Day" },
  { value: "listWeek", label: "List" },
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
  { value: "DAILY" },
  { value: "WEEKLY" },
  { value: "MONTHLY" },
  { value: "YEARLY" },
] as const;

export const CALENDAR_RECURRENCE_WEEKDAY_OPTIONS = [
  { value: "MO" },
  { value: "TU" },
  { value: "WE" },
  { value: "TH" },
  { value: "FR" },
  { value: "SA" },
  { value: "SU" },
] as const;
