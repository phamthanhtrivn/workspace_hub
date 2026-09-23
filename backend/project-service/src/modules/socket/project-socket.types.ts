export const ProjectSocketEvent = {
  JOIN: 'project:join',
  LEAVE: 'project:leave',
  CHANGED: 'project:changed',
} as const;

export type ProjectResource =
  | 'PROJECT'
  | 'TASK'
  | 'MEMBER'
  | 'INVITATION'
  | 'CHECKLIST'
  | 'COMMENT'
  | 'LABEL'
  | 'DEPENDENCY'
  | 'DOCUMENT';

export type ProjectChangeAction = 'CREATED' | 'UPDATED' | 'DELETED';

export interface ProjectChangedEvent {
  projectId: string;
  resource: ProjectResource;
  action: ProjectChangeAction;
  actorId: string;
  entityId?: string;
  taskId?: string;
  taskIds?: string[];
  data?: unknown;
  occurredAt: string;
}

export interface ProjectRoomRequest {
  projectId?: string;
}

export interface ProjectRoomResponse {
  success: boolean;
  projectId?: string;
  message?: string;
}
