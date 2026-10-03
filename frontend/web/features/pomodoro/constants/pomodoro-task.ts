export const POMODORO_TASK_SETTINGS = {
  historyDays: 90,
  historyPageSize: 5,
  projectPageSize: 10,
  defaultCalendarSessions: 2,
  maxCalendarSessions: 20,
  maxGoalTitleLength: 200,
  taskRefetchInterval: 60_000,
} as const;

export const POMODORO_FOCUS_SOURCES = [
  { value: "free", label: "Free focus" },
  { value: "calendar", label: "Calendar tasks" },
  { value: "project", label: "Project tasks" },
] as const;

export const POMODORO_TASK_MESSAGES = {
  unavailable: "This task is no longer available for focus. Choose another task.",
  busy: "Saving the focus session. Please try again shortly.",
  notReady: "Pomodoro is loading. Please try again shortly.",
  conflict: "The timer changed in another tab or device. The latest session has been restored.",
  startFailed: "Unable to start focus. Please try again.",
} as const;
