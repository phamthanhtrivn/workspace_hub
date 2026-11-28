import { normalizeTask, type TaskApiModel } from './task.api';
import type { ProjectSpaceStatusResponse } from './project.api';
import type { ProjectChangedEvent } from './project-socket.service';
import type { Task } from '../types/project';

export { projectQueriesForEvent } from './project-invalidation';
export type { ProjectQueryInvalidation } from './project-invalidation';

function isTaskPayload(value: unknown): value is TaskApiModel {
  if (!value || typeof value !== 'object') return false;
  const task = value as Partial<TaskApiModel>;
  return typeof task.id === 'string' && typeof task.projectId === 'string' && typeof task.title === 'string';
}

type ProjectSpaceStatusPayload = Pick<
  ProjectSpaceStatusResponse,
  'exists' | 'spaceId' | 'channelId'
>;

function isProjectSpaceStatusPayload(value: unknown): value is ProjectSpaceStatusPayload {
  if (!value || typeof value !== 'object') return false;
  const status = value as Partial<ProjectSpaceStatusResponse>;
  const hasValidSpaceId =
    typeof status.spaceId === 'string' ||
    status.spaceId === null ||
    status.spaceId === undefined;
  const hasValidChannelId =
    typeof status.channelId === 'string' ||
    status.channelId === null ||
    status.channelId === undefined;
  return typeof status.exists === 'boolean' && hasValidSpaceId && hasValidChannelId;
}

export function applyProjectSpaceSocketEvent(
  current: ProjectSpaceStatusResponse | undefined,
  event: ProjectChangedEvent,
): ProjectSpaceStatusResponse | undefined {
  if (
    event.resource !== 'PROJECT_SPACE' ||
    !isProjectSpaceStatusPayload(event.data)
  ) {
    return current;
  }

  return {
    projectId: event.projectId,
    exists: event.data.exists,
    spaceId: event.data.spaceId ?? null,
    channelId: event.data.channelId ?? null,
  };
}

export function applyTaskSocketEvent(
  current: Task[] | undefined,
  event: ProjectChangedEvent,
): Task[] | undefined {
  if (!current || event.resource !== 'TASK') return current;
  const taskId = event.taskId ?? event.entityId;
  if (!taskId) return current;

  if (event.action === 'DELETED') {
    return current
      .filter((task) => task.id !== taskId)
      .map((task) => task.parentTaskId === taskId
        ? { ...task, parentTaskId: undefined }
        : task);
  }
  if (!isTaskPayload(event.data)) return current;

  const task = normalizeTask(event.data);
  const existingIndex = current.findIndex((item) => item.id === task.id);
  if (existingIndex < 0) return [...current, task];
  return current.map((item) => item.id === task.id ? task : item);
}
