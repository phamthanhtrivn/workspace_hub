export enum ProjectRealtimeEvent {
  PROJECT_CREATED = 'project:created',
  PROJECT_UPDATED = 'project:updated',
  PROJECT_ARCHIVED = 'project:archived',
  TASK_CREATED = 'task:created',
  TASK_UPDATED = 'task:updated',
  TASK_DELETED = 'task:deleted',
}

export const projectRoom = (projectId: string): string => `project:${projectId}`;
export const userRoom = (userId: string): string => `user:${userId}`;
