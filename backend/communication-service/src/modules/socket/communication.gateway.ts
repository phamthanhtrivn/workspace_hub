import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from '../message/message.service';
import { PollService } from '../poll/poll.service';
import { NoteService } from '../note/note.service';
import { DirectMessageService } from '../direct-message/direct-message.service';
import { ChatSocketHandler } from '../chat/socket/chat-socket.handler';
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
    messageService: MessageService,
    directMessageService: DirectMessageService,
    pollService: PollService,
    noteService: NoteService,
    private readonly socketEventEmitter: SocketEventEmitter,
    private readonly socketRoomService: SocketRoomService,
  ) {
    super(messageService, directMessageService, pollService, noteService);
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
