import { ChatEvent } from '../chat/chat-socket.events';
import { ChannelAccessService } from '../../channel/access/channel-access.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { emitWithActiveSessions } from '../../../common/auth/socket-session';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { SocketRoomService } from './socket-room.service';

const MEMBERSHIP_REMOVAL_EVENTS: ReadonlySet<string> = new Set([ChatEvent.MEMBER_KICKED, ChatEvent.MEMBER_LEFT]);

@Injectable()
export class SocketEventEmitter {
  private server?: Server;

  constructor(private readonly socketRoomService: SocketRoomService, private readonly access: ChannelAccessService, private readonly prisma: PrismaService) {}

  bindServer(server: Server): void {
    this.server = server;
  }

  emitToRooms<TPayload>(
    rooms: string | string[],
    event: string,
    payload: TPayload,
  ): void {
    const context = payload as Record<string, unknown>;
    const removal = MEMBERSHIP_REMOVAL_EVENTS.has(event);
    void emitWithActiveSessions(this.server, rooms, event, payload, async userId => {
      if (removal) return;
      if (typeof context.channelId === 'string') await this.access.assertPrivateAccess(context.channelId, userId);
      if (typeof context.conversationId === 'string') {
        const participant = await this.prisma.directConversationParticipant.findUnique({ where: { conversationId_userId: { conversationId: context.conversationId, userId } } });
        if (!participant) throw new Error('Not a participant');
      }
    }).catch(() => undefined);
  }

  emitToUser<TPayload>(userId: string, event: string, payload: TPayload): void {
    this.emitToRooms(this.socketRoomService.user(userId), event, payload);
  }

  leaveRoom(room: string): void {
    this.server?.in(room).socketsLeave(room);
  }

  removeUserFromRoom(userId: string, room: string): void {
    this.server
      ?.in([userId, this.socketRoomService.user(userId)])
      .socketsLeave(room);
  }

  getServer(): Server | undefined {
    return this.server;
  }
}
