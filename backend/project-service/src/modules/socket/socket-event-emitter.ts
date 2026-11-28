import { PrismaService } from '../../common/prisma/prisma.service';
import { emitWithActiveSessions } from '../../common/auth/socket-session';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { SocketRoomService } from './socket-room.service';

@Injectable()
export class SocketEventEmitter {
  private server?: Server;

  constructor(private readonly rooms: SocketRoomService, private readonly prisma: PrismaService) {}

  bindServer(server: Server): void {
    this.server = server;
  }

  emitToRooms<T>(rooms: string | string[], event: string, payload: T): void {
    const context = payload as { projectId?: string; resource?: string; action?: string };
    void emitWithActiveSessions(this.server, rooms, event, payload, async userId => {
      if (!context.projectId || (context.resource === 'MEMBER' && context.action === 'DELETED')) return;
      const allowed = await this.prisma.project.findFirst({ where: { id: context.projectId, OR: [
        { ownerId: userId }, { members: { some: { userId, status: 'ACTIVE' } } },
      ] }, select: { id: true } });
      if (!allowed) throw new Error('Project access denied');
    }).catch(() => undefined);
  }

  emitToUser<T>(userId: string, event: string, payload: T): void {
    this.emitToRooms(this.rooms.user(userId), event, payload);
  }

  removeUserFromRoom(userId: string, room: string): void {
    this.server?.in(this.rooms.user(userId)).socketsLeave(room);
  }
}
