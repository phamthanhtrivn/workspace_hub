import { Module, forwardRef } from '@nestjs/common';
import { CommunicationGateway } from './communication.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { MessageModule } from '../message/message.module';
import { SocketEventEmitter } from './services/socket-event-emitter';
import { SocketRoomService } from './services/socket-room.service';
import { ChatSocketPublisher } from './chat/chat-socket.publisher';
import { ChatSocketRoomResolver } from './chat/chat-socket-room-resolver';
import { ChatSocketHandler } from './chat/chat-socket.handler';
import { ChatRoomHandler } from './chat/handlers/chat-room.handler';
import { MeetingSocketHandler } from './meeting/meeting-socket.handler';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => MessageModule),
  ],
  providers: [
    CommunicationGateway,
    {
      provide: ChatSocketHandler,
      useExisting: CommunicationGateway,
    },
    SocketEventEmitter,
    SocketRoomService,
    ChatSocketPublisher,
    ChatSocketRoomResolver,
    ChatRoomHandler,
    MeetingSocketHandler,
  ],
  exports: [
    CommunicationGateway,
    SocketEventEmitter,
    SocketRoomService,
    ChatSocketPublisher,
    ChatSocketRoomResolver,
    ChatSocketHandler,
    MeetingSocketHandler,
  ],
})
export class SocketModule {}
