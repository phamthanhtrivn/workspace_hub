import {
  TaskStatus,
  isTerminalTaskStatus,
  type Task,
} from "./types/project";

const STATUS_FLOW = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "TO DO",
  [TaskStatus.IN_PROGRESS]: "IN PROGRESS",
  [TaskStatus.IN_REVIEW]: "IN REVIEW",
  [TaskStatus.DONE]: "DONE",
  [TaskStatus.CANCELLED]: "ĐÃ HỦY",
};

export function canMoveTaskForward(task: Task, nextStatus: TaskStatus): boolean {
  if (task.status === nextStatus || isTerminalTaskStatus(task.status)) return false;
  if (nextStatus === TaskStatus.CANCELLED) return true;
  return STATUS_FLOW.indexOf(nextStatus) > STATUS_FLOW.indexOf(task.status);
}
