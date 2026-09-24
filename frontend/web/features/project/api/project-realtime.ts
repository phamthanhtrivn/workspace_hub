import type { QueryKey } from '@tanstack/react-query';
import { normalizeTask, type TaskApiModel } from './task.api';
import type { ProjectSpaceStatusResponse } from './project.api';
import type { ProjectChangedEvent } from './project-socket.service';
import type { Task } from '../types/project';

export interface ProjectQueryInvalidation {
  queryKey: QueryKey;
  exact?: boolean;
}

export function projectQueriesForEvent(event: ProjectChangedEvent): ProjectQueryInvalidation[] {
  const projectKey = ['projects', event.projectId];
  const invalidations: ProjectQueryInvalidation[] = [];

  if (
    event.resource === 'PROJECT' ||
    event.resource === 'TASK' ||
    event.resource === 'MEMBER' ||
    event.resource === 'INVITATION'
  ) {
    invalidations.push({ queryKey: ['projects'], exact: true });
  }
  if (
    event.resource === 'PROJECT' ||
    event.resource === 'MEMBER' ||
    event.resource === 'INVITATION'
  ) {
    invalidations.push({ queryKey: projectKey, exact: true });
  }

  const resourceKeys: Partial<Record<ProjectChangedEvent['resource'], QueryKey[]>> = {
    TASK: [[...projectKey, 'tasks'], [...projectKey, 'task-status-counts']],
    MEMBER: [[...projectKey, 'members'], ['documents'], [...projectKey, 'documents']],
    INVITATION: [
      [...projectKey, 'members'],
      [...projectKey, 'invitations', 'pending'],
      ['projects', 'invitations', 'mine'],
      ['documents'],
      [...projectKey, 'documents'],
    ],
    PROJECT_SPACE: [[...projectKey, 'space-status']],
    CHECKLIST: [[...projectKey, 'tasks']],
    TASK_DOCUMENT: [[...projectKey, 'tasks']],
    LABEL: [[...projectKey, 'labels'], [...projectKey, 'tasks']],
    DEPENDENCY: [[...projectKey, 'dependencies'], [...projectKey, 'tasks']],
    DOCUMENT: [
      ['documents'],
      ['document-versions'],
      ['document-preview'],
      ['folder-picker'],
      [...projectKey, 'documents'],
    ],
  };

  for (const queryKey of resourceKeys[event.resource] ?? []) {
    invalidations.push({ queryKey });
  }
  if (event.resource === 'DOCUMENT' && event.entityId) {
    invalidations.push({ queryKey: ['document-versions', event.entityId] });
    invalidations.push({ queryKey: ['document-preview', event.entityId] });
  }
  if (event.resource === 'TASK_DOCUMENT' && event.taskId) {
    invalidations.push({ queryKey: ['tasks', event.taskId] });
    invalidations.push({ queryKey: ['tasks', event.taskId, 'documents'] });
    invalidations.push({ queryKey: ['tasks', event.taskId, 'activities'] });
  }

  const taskIds = new Set(event.taskIds ?? []);
  if (event.taskId) taskIds.add(event.taskId);
  if (event.resource === 'TASK' && event.entityId) taskIds.add(event.entityId);
  if (event.resource === 'DEPENDENCY' && event.data && typeof event.data === 'object') {
    const dependency = event.data as Partial<{
      predecessorTaskId: unknown;
      successorTaskId: unknown;
    }>;
    if (typeof dependency.predecessorTaskId === 'string') {
      taskIds.add(dependency.predecessorTaskId);
    }
    if (typeof dependency.successorTaskId === 'string') {
      taskIds.add(dependency.successorTaskId);
    }
  }
  for (const taskId of taskIds) {
    invalidations.push({ queryKey: ['tasks', taskId] });
  }

  return invalidations;
}

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
