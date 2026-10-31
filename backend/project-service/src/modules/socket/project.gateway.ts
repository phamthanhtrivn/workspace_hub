import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { isUUID } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectMemberStatus } from '../project/project.enums';
import { verifyAccessToken } from '../../common/auth/access-token';
import { allowSocketRequest, socketCorsOptions } from '../../common/auth/socket-origin';
import { SocketEventEmitter } from './socket-event-emitter';
import { SocketRoomService } from './socket-room.service';
import {
  ProjectRoomRequest,
  ProjectRoomResponse,
  ProjectSocketEvent,
} from './project-socket.types';

@WebSocketGateway({
  path: '/project.io',
  cors: socketCorsOptions,
  allowRequest: allowSocketRequest,
})
export class ProjectGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ProjectGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: SocketEventEmitter,
    private readonly rooms: SocketRoomService,
  ) {}

  afterInit(server: Server): void {
    server.use((client, next) => {
      try {
        verifyAccessToken(this.accessToken(client));
        next();
      } catch {
        next(new Error('A valid access token is required'));
      }
    });
    this.events.bindServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.accessToken(client);

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const userId = verifyAccessToken(token);
      client.data.userId = userId;

      const projects = await this.prisma.project.findMany({
        where: {
          archived: false,
          OR: [
            { ownerId: userId },
            {
              members: {
                some: { userId, status: ProjectMemberStatus.ACTIVE },
              },
            },
          ],
        },
        select: { id: true },
      });

      await client.join([
        this.rooms.user(userId),
        ...projects.map((project) => this.rooms.project(project.id)),
      ]);
    } catch {
      this.logger.warn('Rejected unauthenticated project socket connection');
      client.disconnect();
    }
  }

  @SubscribeMessage(ProjectSocketEvent.JOIN)
  async joinProject(
    @MessageBody() request: ProjectRoomRequest,
    @ConnectedSocket() client: Socket,
  ): Promise<ProjectRoomResponse> {
    const projectId = request?.projectId;
    const userId = client.data.userId as string | undefined;
    if (!userId || !projectId || !isUUID(projectId))
      return { success: false, message: 'Invalid project room request' };

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        archived: false,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: { userId, status: ProjectMemberStatus.ACTIVE },
            },
          },
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
  async leaveProject(
    @MessageBody() request: ProjectRoomRequest,
    @ConnectedSocket() client: Socket,
  ): Promise<ProjectRoomResponse> {
    const projectId = request?.projectId;
    if (!projectId || !isUUID(projectId))
      return { success: false, message: 'Invalid project room request' };
    await client.leave(this.rooms.project(projectId));
    return { success: true, projectId };
  }

  handleDisconnect(): void {}

  private accessToken(client: Socket): unknown {
    return client.handshake.auth?.token || client.handshake.query?.token ||
      client.handshake.headers.authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
  }
}
