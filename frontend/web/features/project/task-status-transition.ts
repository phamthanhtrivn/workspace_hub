import {
  TaskStatus,
  isTerminalTaskStatus,
  type Task,
} from "./types/project";
import { TASK_STATUS_RESTRICTIONS } from "./constants/task.constants";

type StatusTask = Pick<Task, "status"> & Partial<Pick<Task, "id">>;

const STATUS_FLOW = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];

export function getOpenTaskSubtasks(taskId: string, tasks: readonly Task[]): Task[] {
  return tasks.filter((candidate) =>
    candidate.parentTaskId === taskId && !candidate.deletedAt && !isTerminalTaskStatus(candidate.status),
  );
}

export function getTaskStatusTransitionReason(
  task: StatusTask,
  nextStatus: TaskStatus,
  tasks: readonly Task[] = [],
): string | undefined {
  if (isTerminalTaskStatus(task.status)) return TASK_STATUS_RESTRICTIONS.readOnly;
  if (task.status === nextStatus) return TASK_STATUS_RESTRICTIONS.current;
  if (nextStatus === TaskStatus.CANCELLED) return undefined;

  const currentOrder = STATUS_FLOW.indexOf(task.status);
  const nextOrder = STATUS_FLOW.indexOf(nextStatus);
  const isReviewReturn = task.status === TaskStatus.IN_REVIEW && nextStatus === TaskStatus.IN_PROGRESS;
  if (!isReviewReturn && (currentOrder < 0 || nextOrder < 0 || nextOrder < currentOrder)) {
    return TASK_STATUS_RESTRICTIONS.backwards;
  }
  if (nextStatus === TaskStatus.DONE && task.id && getOpenTaskSubtasks(task.id, tasks).length > 0) {
    return TASK_STATUS_RESTRICTIONS.openSubtasks;
  }
  return undefined;
}

export function canMoveTaskToStatus(task: StatusTask, nextStatus: TaskStatus, tasks: readonly Task[] = []): boolean {
  return !getTaskStatusTransitionReason(task, nextStatus, tasks);
}
