import type { AxiosRequestConfig } from "axios";
import { TASK_STATUS_RESTRICTIONS } from "../constants/task.constants";

// Exact backend business messages, scoped to task mutations that opt in.
export const TASK_EXPECTED_CONFLICT_MESSAGES = [
  TASK_STATUS_RESTRICTIONS.backwards,
  TASK_STATUS_RESTRICTIONS.readOnly,
  TASK_STATUS_RESTRICTIONS.openSubtasks,
  "Task was changed by another request",
  "A task cannot be its own parent",
  "Only top-level tasks can be parents",
  "A task with children cannot become a subtask",
  "A task cannot depend on its parent or subtask.",
  "A task cannot be assigned and unassigned at the same time",
  "Start date cannot be after due date",
  "Duplicate documents cannot be attached",
  "One or more documents are already attached",
  "Reopen the parent task before reopening this subtask.",
] as const;

export function taskActionRequest(): AxiosRequestConfig {
  return { expectedConflictMessages: TASK_EXPECTED_CONFLICT_MESSAGES };
}
