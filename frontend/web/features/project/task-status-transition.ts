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

export function canMoveTaskToStatus(task: Task, nextStatus: TaskStatus): boolean {
  if (task.status === nextStatus || isTerminalTaskStatus(task.status)) return false;
  if (nextStatus === TaskStatus.CANCELLED) return true;
  if (
    task.status === TaskStatus.IN_REVIEW &&
    nextStatus === TaskStatus.IN_PROGRESS
  ) {
    return true;
  }
  return STATUS_FLOW.indexOf(nextStatus) > STATUS_FLOW.indexOf(task.status);
}
