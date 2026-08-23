export const CALENDAR_DEFAULT_EVENT_COLOR = "#2563eb";
export const CALENDAR_DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;
export const CALENDAR_INITIAL_RANGE_LOOKBACK_DAYS = 14;
export const CALENDAR_INITIAL_RANGE_LOOKAHEAD_DAYS = 45;
export const CALENDAR_INITIAL_VIEW = "timeGridWeek";
export const CALENDAR_SLOT_MIN_TIME = "06:00:00";
export const CALENDAR_SLOT_MAX_TIME = "22:00:00";

export const CALENDAR_COLOR_CHOICES = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
] as const;

export const CALENDAR_VIEW_OPTIONS = [
  { value: "dayGridMonth", labelId: "calendar.view.month" },
  { value: "timeGridWeek", labelId: "calendar.view.week" },
  { value: "timeGridDay", labelId: "calendar.view.day" },
  { value: "listWeek", labelId: "calendar.view.list" },
] as const;
