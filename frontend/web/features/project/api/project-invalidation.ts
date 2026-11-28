import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { ProjectChangedEvent } from './project-socket.service';

export type ProjectChange = Pick<ProjectChangedEvent, 'projectId' | 'resource'> &
  Partial<Pick<ProjectChangedEvent, 'action' | 'entityId' | 'taskId' | 'taskIds' | 'data'>>;

export interface ProjectQueryInvalidation {
  queryKey: QueryKey;
  exact?: boolean;
}

const PROJECT_SUMMARY_KEYS: QueryKey[] = [
  ['projects', 'list'],
  ['projects', 'dashboard-active'],
  ['projects', 'dashboard-tasks'],
  ['projects', 'dashboard-completed-tasks'],
  ['pomodoro', 'focus-tasks'],
];

export function projectQueriesForEvent(event: ProjectChange): ProjectQueryInvalidation[] {
  const projectKey = ['projects', event.projectId];
  const invalidations: ProjectQueryInvalidation[] = [];
  const add = (...keys: QueryKey[]) => keys.forEach(queryKey => invalidations.push({ queryKey }));

  if (['PROJECT', 'TASK', 'MEMBER', 'INVITATION'].includes(event.resource)) {
    add(...PROJECT_SUMMARY_KEYS);
  }
  if (['PROJECT', 'MEMBER', 'INVITATION'].includes(event.resource)) {
    invalidations.push({ queryKey: projectKey, exact: true });
  }
  if (event.resource === 'PROJECT' || event.resource === 'MEMBER') {
    add([...projectKey, 'notification-identity']);
  }
  const invitationAccepted = event.resource === 'INVITATION' &&
    typeof event.data === 'object' && event.data !== null &&
    'status' in event.data && event.data.status === 'ACCEPTED';
  if (event.resource === 'MEMBER' || invitationAccepted) {
    add([...projectKey, 'members'], [...projectKey, 'access-sync'], [...projectKey, 'tasks'],
      ['documents'], [...projectKey, 'documents']);
  }
  if (event.resource === 'PROJECT' || event.resource === 'MEMBER' || invitationAccepted) {
    add(['projects', 'calendar-list']);
  }

  const resourceKeys: Partial<Record<ProjectChangedEvent['resource'], QueryKey[]>> = {
    PROJECT: [[...projectKey, 'access-sync'], [...projectKey, 'space-status']],
    TASK: [[...projectKey, 'tasks'], [...projectKey, 'task-status-counts'], [...projectKey, 'linked-task']],
    INVITATION: [[...projectKey, 'invitations', 'pending'], ['projects', 'invitations', 'mine']],
    PROJECT_SPACE: [[...projectKey, 'space-status']],
    CHECKLIST: [[...projectKey, 'tasks']],
    TASK_DOCUMENT: [[...projectKey, 'tasks']],
    LABEL: [[...projectKey, 'labels'], [...projectKey, 'tasks']],
    DEPENDENCY: [[...projectKey, 'dependencies'], [...projectKey, 'tasks']],
    DOCUMENT: [['documents'], ['folder-picker'], [...projectKey, 'documents']],
  };
  add(...(resourceKeys[event.resource] ?? []));
  if (event.resource === 'DOCUMENT') {
    add(event.entityId ? ['document-versions', event.entityId] : ['document-versions'],
      event.entityId ? ['document-preview', event.entityId] : ['document-preview']);
  }

  const taskIds = new Set(event.taskIds ?? []);
  if (event.taskId) taskIds.add(event.taskId);
  if (event.resource === 'TASK' && event.entityId) taskIds.add(event.entityId);
  if (event.resource === 'DEPENDENCY' && event.data && typeof event.data === 'object') {
    const dependency = event.data as { predecessorTaskId?: unknown; successorTaskId?: unknown };
    if (typeof dependency.predecessorTaskId === 'string') taskIds.add(dependency.predecessorTaskId);
    if (typeof dependency.successorTaskId === 'string') taskIds.add(dependency.successorTaskId);
  }
  for (const taskId of taskIds) add(['tasks', taskId]);

  return invalidations.filter((filter, index) => invalidations.findIndex(candidate =>
    candidate.exact === filter.exact && JSON.stringify(candidate.queryKey) === JSON.stringify(filter.queryKey)) === index);
}

export async function invalidateProjectChange(client: QueryClient, change: ProjectChange): Promise<void> {
  await Promise.all(projectQueriesForEvent(change).map(filter => client.invalidateQueries(filter)));
}
