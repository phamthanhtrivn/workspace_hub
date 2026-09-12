import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { isUUID } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { AccessTokenVerifier } from '../../common/auth/access-token-verifier';
import { ProjectAccessService } from './project-access.service';
import { ProjectRealtimeService } from './project-realtime.service';
import { ProjectRoomRequest, ProjectRoomResponse, ProjectSocketEvent } from './project-socket.types';

const socketOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ??
  process.env.FRONTEND_URL ??
  'http://localhost:3000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

@WebSocketGateway({
  path: '/project.io',
  cors: { origin: socketOrigins, credentials: true },
})
export class ProjectGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ProjectGateway.name);

  @WebSocketServer()
  declare server: Server;

  constructor(
    private readonly tokens: AccessTokenVerifier,
    private readonly access: ProjectAccessService,
    private readonly realtime: ProjectRealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.bindServer(server);
  }

  handleConnection(client: Socket): void {
    try {
      const userId = this.tokens.verify(this.readToken(client));
      client.data.userId = userId;
      void client.join(this.realtime.userRoom(userId));
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage(ProjectSocketEvent.JOIN)
  async joinProject(
    @MessageBody() request: ProjectRoomRequest,
    @ConnectedSocket() client: Socket,
  ): Promise<ProjectRoomResponse> {
    const projectId = request?.projectId;
    const userId = client.data.userId as string | undefined;
    if (!userId || !projectId || !isUUID(projectId)) {
      return { success: false, message: 'Invalid project room request' };
    }

    try {
      await this.access.requireReadAccess(userId, projectId);
      await client.join(this.realtime.projectRoom(projectId));
      return { success: true, projectId };
    } catch {
      this.logger.warn(`Rejected project room join for user ${userId}`);
      return { success: false, message: 'Project access denied' };
    }
  }

  @SubscribeMessage(ProjectSocketEvent.LEAVE)
  async leaveProject(
    @MessageBody() request: ProjectRoomRequest,
    @ConnectedSocket() client: Socket,
  ): Promise<ProjectRoomResponse> {
    const projectId = request?.projectId;
    if (!projectId || !isUUID(projectId)) {
      return { success: false, message: 'Invalid project room request' };
    }

    await client.leave(this.realtime.projectRoom(projectId));
    return { success: true, projectId };
  }

  private readToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;
    const bearer = client.handshake.headers.authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
    const token = typeof authToken === 'string' ? authToken : bearer;
    if (!token) throw new Error('Missing access token');
    return token;
  }
}
