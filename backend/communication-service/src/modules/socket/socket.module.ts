import { Module } from '@nestjs/common';
import { CommunicationGateway } from './communication.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChannelAccessModule } from '../channel/access/channel-access.module';
import { DirectMessagePermissionModule } from '../direct-message/direct-message-permission.module';
import { SocketPublishingModule } from './socket-publishing.module';
import { ChatSocketHandler } from './chat/chat-socket.handler';
import { ChatRoomHandler } from './chat/handlers/chat-room.handler';
import { MeetingSocketHandler } from './meeting/meeting-socket.handler';

@Module({
  imports: [
    PrismaModule,
    ChannelAccessModule,
    DirectMessagePermissionModule,
    SocketPublishingModule,
  ],
  providers: [
    CommunicationGateway,
    {
      provide: ChatSocketHandler,
      useExisting: CommunicationGateway,
    },
    ChatRoomHandler,
    MeetingSocketHandler,
  ],
  exports: [
    SocketPublishingModule,
    CommunicationGateway,
    ChatSocketHandler,
    MeetingSocketHandler,
  ],
})
export class SocketModule {}
