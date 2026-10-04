export const POMODORO_TASK_SETTINGS = {
  historyDays: 90,
  historyPageSize: 5,
  projectPageSize: 10,
  defaultCalendarSessions: 2,
  maxGoalTitleLength: 200,
  maxDescriptionLength: 2000,
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
  personalCalendarRequired: "Your personal task list is unavailable. Open Calendar to set it up, then try again.",
  createFailed: "Unable to create the task. Please try again.",
  savedTaskUnavailable: "Task saved to My tasks, but it is not available for focus. Your current session has been kept.",
  invalidDeadline: "Choose a valid deadline date and time.",
  descriptionTooLong: "Shorten the description to leave room for the task deadline (2,000 characters total).",
} as const;
