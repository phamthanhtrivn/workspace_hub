import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { isUUID } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { AccessTokenVerifier } from '../../common/auth/access-token-verifier';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectMemberStatus } from '../project/project.enums';
import { SocketEventEmitter } from './socket-event-emitter';
import { SocketRoomService } from './socket-room.service';
import { ProjectRoomRequest, ProjectRoomResponse, ProjectSocketEvent } from './project-socket.types';

const socketOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? process.env.FRONTEND_URL ?? 'http://localhost:3000')
  .split(',').map((origin) => origin.trim()).filter(Boolean);

@WebSocketGateway({ path: '/project.io', cors: { origin: socketOrigins, credentials: true } })
export class ProjectGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ProjectGateway.name);

  constructor(
    private readonly tokens: AccessTokenVerifier,
    private readonly prisma: PrismaService,
    private readonly events: SocketEventEmitter,
    private readonly rooms: SocketRoomService,
  ) {}

  afterInit(server: Server): void {
    this.events.bindServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const userId = this.tokens.verify(this.readToken(client));
      client.data.userId = userId;
      const projects = await this.prisma.project.findMany({
        where: {
          archived: false,
          OR: [
            { ownerId: userId },
            { members: { some: { userId, status: ProjectMemberStatus.ACTIVE } } },
          ],
        },
        select: { id: true },
      });
      await client.join([
        this.rooms.user(userId),
        ...projects.map((project) => this.rooms.project(project.id)),
      ]);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage(ProjectSocketEvent.JOIN)
  async joinProject(@MessageBody() request: ProjectRoomRequest, @ConnectedSocket() client: Socket): Promise<ProjectRoomResponse> {
    const projectId = request?.projectId;
    const userId = client.data.userId as string | undefined;
    if (!userId || !projectId || !isUUID(projectId)) return { success: false, message: 'Invalid project room request' };

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        archived: false,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, status: ProjectMemberStatus.ACTIVE } } },
        ],
      },
      select: { id: true },
    });
    if (!project) {
      this.logger.warn(`Rejected project room join for user ${userId}`);
      return { success: false, message: 'Project access denied' };
    }
    await client.join(this.rooms.project(projectId));
    return { success: true, projectId };
  }

  @SubscribeMessage(ProjectSocketEvent.LEAVE)
  async leaveProject(@MessageBody() request: ProjectRoomRequest, @ConnectedSocket() client: Socket): Promise<ProjectRoomResponse> {
    const projectId = request?.projectId;
    if (!projectId || !isUUID(projectId)) return { success: false, message: 'Invalid project room request' };
    await client.leave(this.rooms.project(projectId));
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
