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

export function canMoveTaskForward(task: Task, nextStatus: TaskStatus): boolean {
  if (task.status === nextStatus || isTerminalTaskStatus(task.status)) return false;
  if (nextStatus === TaskStatus.CANCELLED) return true;
  return STATUS_FLOW.indexOf(nextStatus) > STATUS_FLOW.indexOf(task.status);
}
