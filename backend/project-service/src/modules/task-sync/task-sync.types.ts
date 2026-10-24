export interface TaskSyncEvent {
  schemaVersion: 1;
  taskId: string;
  projectId: string;
  version: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  deleted: boolean;
}

export interface SyncableTask {
  id: string;
  projectId: string;
  version: bigint;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  deletedAt: Date | null;
}

export function taskSyncEvent(task: SyncableTask): TaskSyncEvent {
  return {
    schemaVersion: 1,
    taskId: task.id,
    projectId: task.projectId,
    version: task.version.toString(),
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    deleted: task.deletedAt !== null,
  };
}

export const TASK_SYNC_BATCH_SIZE = 100;
export const TASK_SYNC_RETRY_MAX_MS = 60_000;
export const TASK_SYNC_SEND_TIMEOUT_MS = 30_000;
