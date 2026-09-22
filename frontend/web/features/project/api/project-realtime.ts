import type { QueryKey } from '@tanstack/react-query';
import { normalizeTask, type TaskApiModel } from './task.api';
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
    MEMBER: [[...projectKey, 'members']],
    INVITATION: [
      [...projectKey, 'members'],
      [...projectKey, 'invitations', 'pending'],
      ['projects', 'invitations', 'mine'],
    ],
    CHECKLIST: [[...projectKey, 'tasks']],
    LABEL: [[...projectKey, 'labels'], [...projectKey, 'tasks']],
    DEPENDENCY: [[...projectKey, 'dependencies']],
  };

  for (const queryKey of resourceKeys[event.resource] ?? []) {
    invalidations.push({ queryKey });
  }

  const taskIds = new Set(event.taskIds ?? []);
  if (event.taskId) taskIds.add(event.taskId);
  if (event.resource === 'TASK' && event.entityId) taskIds.add(event.entityId);
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
