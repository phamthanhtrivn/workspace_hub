import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatSocketHandler } from './chat/chat-socket.handler';
import { ChatMessageInteractionHandler } from './chat/handlers/chat-message-interaction.handler';
import { ChatMessageHandler } from './chat/handlers/chat-message.handler';
import { ChatRoomHandler } from './chat/handlers/chat-room.handler';
import { SocketEventEmitter } from './services/socket-event-emitter';
import { SocketRoomService } from './services/socket-room.service';

@WebSocketGateway({
  path: '/communication.io',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class CommunicationGateway
  extends ChatSocketHandler
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  declare server: Server;

  constructor(
    chatRoomHandler: ChatRoomHandler,
    chatMessageHandler: ChatMessageHandler,
    chatMessageInteractionHandler: ChatMessageInteractionHandler,
    private readonly socketEventEmitter: SocketEventEmitter,
    private readonly socketRoomService: SocketRoomService,
  ) {
    super(
      chatRoomHandler,
      chatMessageHandler,
      chatMessageInteractionHandler,
    );
  }

  afterInit(server: Server): void {
    this.server = server;
    this.socketEventEmitter.bindServer(server);
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payloadBase64 = String(token).split('.')[1];
      const decoded = JSON.parse(
        Buffer.from(payloadBase64, 'base64').toString(),
      );
      const userId = decoded.sub || decoded.id;

      if (!userId) {
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      client.join(userId);
      client.join(this.socketRoomService.user(userId));
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_: Socket) {}
}
