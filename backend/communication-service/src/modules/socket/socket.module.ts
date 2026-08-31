import { Module, forwardRef } from '@nestjs/common';
import { CommunicationGateway } from './communication.gateway';
import { MessageModule } from '../message/message.module';
import { PollModule } from '../poll/poll.module';
import { NoteModule } from '../note/note.module';
import { DirectMessageModule } from '../direct-message/direct-message.module';
import { SocketEventEmitter } from './services/socket-event-emitter';
import { SocketRoomService } from './services/socket-room.service';
import { ChatSocketHandler } from './chat/chat-socket.handler';
import { ChatMessageInteractionHandler } from './chat/handlers/chat-message-interaction.handler';
import { ChatMessageHandler } from './chat/handlers/chat-message.handler';
import { ChatRoomHandler } from './chat/handlers/chat-room.handler';
import { MeetingSocketHandler } from './meeting/meeting-socket.handler';

@Module({
  imports: [
    MessageModule,
    PollModule,
    NoteModule,
    forwardRef(() => DirectMessageModule),
  ],
  providers: [
    CommunicationGateway,
    {
      provide: ChatSocketHandler,
      useExisting: CommunicationGateway,
    },
    SocketEventEmitter,
    SocketRoomService,
    ChatRoomHandler,
    ChatMessageHandler,
    ChatMessageInteractionHandler,
    MeetingSocketHandler,
  ],
  exports: [
    CommunicationGateway,
    SocketEventEmitter,
    SocketRoomService,
    ChatSocketHandler,
    MeetingSocketHandler,
  ],
})
export class SocketModule {}
