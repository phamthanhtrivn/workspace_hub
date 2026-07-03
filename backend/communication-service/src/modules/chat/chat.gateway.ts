import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatEvent } from './chat.events';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payloadBase64 = token.split('.')[1];
      const decoded = JSON.parse(
        Buffer.from(payloadBase64, 'base64').toString(),
      );
      const userId = decoded.sub || decoded.id;
      client.data.userId = userId; // standard fields

      client.join(userId);
      this.connectedUsers.add(userId);

      // Notify others that this user is online
      this.server.emit(ChatEvent.USER_ONLINE, { userId });
      // Send current online users to this newly connected client
      client.emit(ChatEvent.ONLINE_USERS, Array.from(this.connectedUsers));
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      this.server.emit(ChatEvent.USER_OFFLINE, { userId });
    }
  }

  @SubscribeMessage(ChatEvent.JOIN_CONVERSATION)
  handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.conversationId) {
      client.join(data.conversationId);
      return { status: 'joined', conversationId: data.conversationId };
    }
  }

  @SubscribeMessage(ChatEvent.SEND_MESSAGE)
  async handleSendMessage(
    @MessageBody() data: { conversationId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.conversationId || !data.content) {
      return { status: 'error', message: 'Invalid data' };
    }

    try {
      // Save message to DB
      const message = await this.prisma.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: userId,
          content: data.content,
          type: MessageType.TEXT,
        },
      });

      // Update conversation updatedAt
      await this.prisma.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      });

      // Fetch all members to send push notification to their personal rooms
      const members = await this.prisma.conversationMember.findMany({
        where: { conversationId: data.conversationId },
        select: { userId: true },
      });
      const memberUserIds = members.map((m) => m.userId);

      // Emit to everyone in the room AND all personal rooms (Socket.io will deduplicate)
      const targetRooms = [data.conversationId, ...memberUserIds];
      this.server.to(targetRooms).emit(ChatEvent.NEW_MESSAGE, message);

      return { status: 'success', data: message };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'Failed to send message' };
    }
  }
}
