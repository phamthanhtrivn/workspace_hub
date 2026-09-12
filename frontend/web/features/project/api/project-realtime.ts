import type { QueryKey } from '@tanstack/react-query';
import type { ProjectChangedEvent } from './project-socket.service';

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
  if (event.resource === 'PROJECT' || event.resource === 'MEMBER') {
    invalidations.push({ queryKey: projectKey, exact: true });
  }

  const resourceKeys: Partial<Record<ProjectChangedEvent['resource'], QueryKey[]>> = {
    TASK: [[...projectKey, 'tasks']],
    SPRINT: [[...projectKey, 'sprints'], [...projectKey, 'tasks']],
    MEMBER: [[...projectKey, 'members']],
    INVITATION: [[...projectKey, 'invitations', 'pending'], ['projects', 'invitations', 'mine']],
    CHECKLIST: [[...projectKey, 'tasks']],
    LABEL: [[...projectKey, 'labels'], [...projectKey, 'tasks']],
    DEPENDENCY: [[...projectKey, 'dependencies']],
    FILE: [[...projectKey, 'files']],
  };
  for (const queryKey of resourceKeys[event.resource] ?? []) {
    invalidations.push({ queryKey });
  }

  const taskIds = new Set(event.taskIds ?? []);
  if (event.taskId) taskIds.add(event.taskId);
  if (event.resource === 'TASK' && event.entityId) taskIds.add(event.entityId);
  for (const taskId of taskIds) invalidations.push({ queryKey: ['tasks', taskId] });

  return invalidations;
}
