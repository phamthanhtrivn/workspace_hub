import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketEventEmitter } from './services/socket-event-emitter';
import { SocketRoomService } from './services/socket-room.service';
import { ChatSocketPublisher } from './chat/chat-socket.publisher';
import { ChatSocketRoomResolver } from './chat/chat-socket-room-resolver';

@Module({
  imports: [PrismaModule],
  providers: [
    SocketEventEmitter,
    SocketRoomService,
    ChatSocketPublisher,
    ChatSocketRoomResolver,
  ],
  exports: [
    SocketEventEmitter,
    SocketRoomService,
    ChatSocketPublisher,
    ChatSocketRoomResolver,
  ],
})
export class SocketPublishingModule {}
