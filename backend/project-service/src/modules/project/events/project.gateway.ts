import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { isUUID } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { ProjectAccessService } from '../services/project-access.service';
import { ProjectRealtimeEvent, projectRoom, userRoom } from './project.events';

type ProjectRoomPayload = { projectId?: string };

@WebSocketGateway({
  path: '/project.io',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ProjectGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly access: ProjectAccessService) {}

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    const userId = this.getUserIdFromToken(token);

    if (!userId) {
      client.disconnect();
      return;
    }

    client.data.userId = userId;
    client.join(userRoom(userId));
  }

  handleDisconnect(_: Socket): void {}

  @SubscribeMessage('project:join')
  async joinProject(
    @MessageBody() payload: ProjectRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const projectId = payload?.projectId;
    const userId = client.data.userId as string | undefined;

    if (!userId || !projectId || !isUUID(projectId)) {
      return { status: 'error', message: 'Invalid project room' };
    }

    try {
      await this.access.requireReadAccess(userId, projectId);
      await client.join(projectRoom(projectId));
      return { status: 'joined', projectId };
    } catch {
      return { status: 'error', message: 'Project access denied' };
    }
  }

  @SubscribeMessage('project:leave')
  leaveProject(
    @MessageBody() payload: ProjectRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (payload?.projectId && isUUID(payload.projectId)) {
      void client.leave(projectRoom(payload.projectId));
    }
    return { status: 'left', projectId: payload?.projectId };
  }

  emitToProject(projectId: string, event: string, payload: unknown): void {
    this.server?.to(projectRoom(projectId)).emit(event, payload);
  }

  emitDataChanged(
    projectId: string,
    resource: string,
    action: 'created' | 'updated' | 'deleted',
    actorId: string,
    data?: unknown,
  ): void {
    this.emitToProject(projectId, ProjectRealtimeEvent.DATA_CHANGED, {
      projectId,
      resource,
      action,
      actorId,
      data,
      occurredAt: new Date().toISOString(),
    });
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }

  private getUserIdFromToken(token: unknown): string | null {
    if (typeof token !== 'string') return null;

    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      const userId = decoded.sub || decoded.id;
      return typeof userId === 'string' && isUUID(userId) ? userId : null;
    } catch {
      return null;
    }
  }
}
