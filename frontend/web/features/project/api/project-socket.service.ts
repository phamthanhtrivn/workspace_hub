import { io, Socket } from 'socket.io-client';

export type ProjectResource =
  | 'PROJECT'
  | 'TASK'
  | 'SPRINT'
  | 'MEMBER'
  | 'INVITATION'
  | 'CHECKLIST'
  | 'COMMENT'
  | 'LABEL'
  | 'DEPENDENCY'
  | 'FILE';

export interface ProjectChangedEvent {
  projectId: string;
  resource: ProjectResource;
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  actorId: string;
  entityId?: string;
  taskId?: string;
  taskIds?: string[];
  data?: unknown;
  occurredAt: string;
}

interface ServerToClientEvents {
  'project:changed': (event: ProjectChangedEvent) => void;
}

interface ClientToServerEvents {
  'project:join': (request: { projectId: string }) => void;
  'project:leave': (request: { projectId: string }) => void;
}

export type ProjectSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class ProjectSocketService {
  private socket: ProjectSocket | null = null;
  private token: string | null = null;
  private joinedProjectIds = new Set<string>();

  connect(token: string): ProjectSocket {
    if (this.socket && this.token === token) return this.socket;
    this.disconnect();

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    this.token = token;
    this.socket = io(apiUrl.replace(/\/api$/, ''), {
      path: '/project.io',
      transports: ['websocket'],
      auth: { token },
    });
    return this.socket;
  }

  syncProjects(projectIds: string[]): void {
    if (!this.socket) return;
    const nextIds = new Set(projectIds);
    for (const projectId of nextIds) {
      if (!this.joinedProjectIds.has(projectId)) {
        this.socket.emit('project:join', { projectId });
      }
    }
    for (const projectId of this.joinedProjectIds) {
      if (!nextIds.has(projectId)) {
        this.socket.emit('project:leave', { projectId });
      }
    }
    this.joinedProjectIds = nextIds;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.token = null;
    this.joinedProjectIds.clear();
  }
}

export const projectSocketService = new ProjectSocketService();
