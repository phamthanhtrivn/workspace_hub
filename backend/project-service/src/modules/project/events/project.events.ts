export enum ProjectRealtimeEvent {
  DATA_CHANGED = 'project:data_changed',
  PROJECT_CREATED = 'project:created',
  PROJECT_UPDATED = 'project:updated',
  PROJECT_ARCHIVED = 'project:archived',
  TASK_CREATED = 'task:created',
  TASK_UPDATED = 'task:updated',
  TASK_DELETED = 'task:deleted',
}

export enum ProjectRealtimeResource {
  PROJECT = 'project',
  TASK = 'task',
  SPRINT = 'sprint',
  MEMBER = 'member',
  INVITATION = 'invitation',
  LABEL = 'label',
  LABEL_MAPPING = 'label_mapping',
  CHECKLIST = 'checklist',
  DEPENDENCY = 'dependency',
  COMMENT = 'comment',
}

export enum ProjectRealtimeAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
}

export const projectRoom = (projectId: string): string => `project:${projectId}`;
export const userRoom = (userId: string): string => `user:${userId}`;
