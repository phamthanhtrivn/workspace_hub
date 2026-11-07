import { attachSocketRecovery } from "@/lib/authenticated-socket";
import { SOCKET_RETRY } from "@/lib/socket-session.constants";
import { io, Socket } from "socket.io-client";

export type ProjectResource =
  | "PROJECT"
  | "TASK"
  | "MEMBER"
  | "INVITATION"
  | "PROJECT_SPACE"
  | "CHECKLIST"
  | "COMMENT"
  | "TASK_DOCUMENT"
  | "LABEL"
  | "DEPENDENCY"
  | "DOCUMENT";

export interface ProjectChangedEvent {
  projectId: string;
  resource: ProjectResource;
  action: "CREATED" | "UPDATED" | "DELETED";
  actorId: string;
  entityId?: string;
  taskId?: string;
  taskIds?: string[];
  data?: unknown;
  occurredAt: string;
}

interface ServerToClientEvents {
  "project:changed": (event: ProjectChangedEvent) => void;
}

interface ClientToServerEvents {
  "project:join": (request: { projectId: string }) => void;
  "project:leave": (request: { projectId: string }) => void;
}

export type ProjectSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class ProjectSocketService {
  private socket: ProjectSocket | null = null;
  private disposeRecovery?: () => void;
  private joinedProjectIds = new Set<string>();
  private listedProjectIds = new Set<string>();
  private watchedProjectIds = new Set<string>();

  connect(token: string): ProjectSocket {
    if (this.socket) return this.socket;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api$/, "");
    this.socket = io(baseUrl, {
      path: "/project.io",
      transports: ["websocket"],
      autoConnect: false,
      reconnection: false,
      timeout: SOCKET_RETRY.timeoutMs,
      auth: { token },
    }) as ProjectSocket;
    this.socket.on("connect", () => {
      this.joinedProjectIds.clear();
      this.syncRooms();
    });
    this.disposeRecovery = attachSocketRecovery(this.socket, token, "project");
    return this.socket;
  }

  private syncRooms(): void {
    if (!this.socket?.connected) return;
    const desired = new Set([
      ...this.listedProjectIds,
      ...this.watchedProjectIds,
    ]);
    for (const projectId of desired) {
      if (this.joinedProjectIds.has(projectId)) continue;
      this.socket.emit("project:join", { projectId });
      this.joinedProjectIds.add(projectId);
    }
    for (const projectId of this.joinedProjectIds) {
      if (desired.has(projectId)) continue;
      this.socket.emit("project:leave", { projectId });
      this.joinedProjectIds.delete(projectId);
    }
  }

  joinProject(projectId: string): void {
    if (!projectId) return;
    this.watchedProjectIds.add(projectId);
    this.syncRooms();
  }

  leaveProject(projectId: string): void {
    this.watchedProjectIds.delete(projectId);
    this.syncRooms();
  }

  syncProjects(projectIds: string[]): void {
    this.listedProjectIds = new Set(projectIds);
    this.syncRooms();
  }

  disconnect(): void {
    this.disposeRecovery?.();
    this.disposeRecovery = undefined;
    this.socket = null;
    this.joinedProjectIds.clear();
    this.listedProjectIds.clear();
    this.watchedProjectIds.clear();
  }

  getSocket(): ProjectSocket | null {
    return this.socket;
  }
}

export const projectSocketService = new ProjectSocketService();
