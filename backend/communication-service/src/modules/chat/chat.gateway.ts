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
import { MessageService } from '../message/message.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messageService: MessageService) {}

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
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // disconnected
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
      const message = await this.messageService.createMessage(
        data.conversationId,
        userId,
        data.content,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.conversationId,
      );

      // Emit to conversation room + all personal rooms (Socket.io deduplicates)
      const targetRooms = [data.conversationId, ...memberUserIds];
      this.server.to(targetRooms).emit(ChatEvent.NEW_MESSAGE, message);

      return { status: 'success', data: message };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'Failed to send message' };
    }
  }
}
