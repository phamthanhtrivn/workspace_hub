import { CALENDAR_TASK_TITLE_MAX_LENGTH } from "@/features/calendar/types/calendar.constants";

export const DASHBOARD_QUICK_TASK = {
  maxTitleLength: CALENDAR_TASK_TITLE_MAX_LENGTH,
  titleRequired: "Enter a task title.",
  titleTooLong: "Keep the task title to 200 characters or fewer.",
  invalidDeadline: "Choose a valid deadline date and time.",
  createFailed: "Could not create the task. Please try again.",
  created: "Task added to My tasks.",
} as const;
