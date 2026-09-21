import { io, Socket } from 'socket.io-client';

export type ProjectResource =
  | 'PROJECT'
  | 'TASK'
  | 'MEMBER'
  | 'INVITATION'
  | 'CHECKLIST'
  | 'COMMENT'
  | 'LABEL'
  | 'DEPENDENCY';

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
  private currentToken: string | null = null;
  private joinedProjectIds = new Set<string>();
  private desiredProjectIds = new Set<string>();

  connect(token: string): ProjectSocket {
    if (this.socket && this.currentToken === token) {
      if (!this.socket.connected && !this.socket.active) {
        this.socket.connect();
      }
      return this.socket;
    }

    if (this.socket) {
      this.disconnect();
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
    const baseUrl = apiUrl.replace(/\/api$/, '');

    this.currentToken = token;
    this.socket = io(baseUrl, {
      path: '/project.io',
      transports: ['websocket'],
      auth: {
        token,
      },
    }) as ProjectSocket;

    this.socket.on('connect', () => {
      this.joinedProjectIds.clear();
      for (const projectId of this.desiredProjectIds) {
        this.socket?.emit('project:join', { projectId });
        this.joinedProjectIds.add(projectId);
      }
    });

    if (!this.socket.connected && !this.socket.active) {
      this.socket.connect();
    }

    return this.socket;
  }

  joinProject(projectId: string): void {
    if (!projectId) return;
    this.desiredProjectIds.add(projectId);
    if (this.socket?.connected && !this.joinedProjectIds.has(projectId)) {
      this.socket.emit('project:join', { projectId });
      this.joinedProjectIds.add(projectId);
    }
  }

  leaveProject(projectId: string): void {
    if (!projectId) return;
    this.desiredProjectIds.delete(projectId);
    if (this.socket?.connected && this.joinedProjectIds.has(projectId)) {
      this.socket.emit('project:leave', { projectId });
      this.joinedProjectIds.delete(projectId);
    }
  }

  syncProjects(projectIds: string[]): void {
    const nextIds = new Set(projectIds);
    for (const id of nextIds) {
      this.desiredProjectIds.add(id);
    }

    if (!this.socket?.connected) return;

    for (const projectId of nextIds) {
      if (!this.joinedProjectIds.has(projectId)) {
        this.socket.emit('project:join', { projectId });
        this.joinedProjectIds.add(projectId);
      }
    }
    for (const projectId of this.joinedProjectIds) {
      if (!nextIds.has(projectId)) {
        this.socket.emit('project:leave', { projectId });
        this.joinedProjectIds.delete(projectId);
      }
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentToken = null;
    this.joinedProjectIds.clear();
    this.desiredProjectIds.clear();
  }

  getSocket(): ProjectSocket | null {
    return this.socket;
  }
}

export const projectSocketService = new ProjectSocketService();

