import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatSocketHandler } from './chat/chat-socket.handler';
import { ChatRoomHandler } from './chat/handlers/chat-room.handler';
import { MeetingEvent } from './meeting/meeting-socket.events';
import { SocketEventEmitter } from './services/socket-event-emitter';
import { SocketRoomService } from './services/socket-room.service';
import { verifyRecordingUserToken } from '../../common/auth/recording-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

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
    private readonly socketEventEmitter: SocketEventEmitter,
    private readonly socketRoomService: SocketRoomService,
    private readonly prisma: PrismaService,
  ) {
    super(chatRoomHandler);
  }

  afterInit(server: Server): void {
    this.server = server;
    this.socketEventEmitter.bindServer(server);
  }

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth as Record<string, unknown>)?.token ||
      client.handshake.query?.token;
    if (typeof token !== 'string' || !token) {
      client.disconnect();
      return;
    }

    try {
      const payloadBase64 = String(token).split('.')[1];
      const decoded = JSON.parse(
        Buffer.from(payloadBase64, 'base64').toString(),
      ) as Record<string, unknown>;
      const userId =
        process.env.JWT_SECRET_KEY ||
        process.env.MEETING_RECORDING_ENABLED === 'true'
          ? verifyRecordingUserToken(String(token))
          : decoded.sub || decoded.id;

      if (typeof userId !== 'string' || !userId) {
        client.disconnect();
        return;
      }

      (client.data as { userId?: string }).userId = userId;
      await client.join(userId);
      await client.join(this.socketRoomService.user(userId));
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage(MeetingEvent.JOIN)
  async handleJoinMeetingRoom(
    @MessageBody() data: { meetingId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = (client.data as { userId?: string }).userId;
    if (
      !data?.meetingId ||
      !userId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        data.meetingId,
      )
    )
      return;
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId: data.meetingId, userId } },
    });
    if (participant?.status === 'JOINED')
      await client.join(this.socketRoomService.meeting(data.meetingId));
  }

  handleDisconnect() {}
}
