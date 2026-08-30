import { Module, forwardRef } from '@nestjs/common';
import { CommunicationGateway } from './communication.gateway';
import { MessageModule } from '../message/message.module';
import { PollModule } from '../poll/poll.module';
import { NoteModule } from '../note/note.module';
import { DirectMessageModule } from '../direct-message/direct-message.module';
import { SocketEventEmitter } from './services/socket-event-emitter';
import { SocketRoomService } from './services/socket-room.service';

@Module({
  imports: [
    MessageModule,
    PollModule,
    NoteModule,
    forwardRef(() => DirectMessageModule),
  ],
  providers: [CommunicationGateway, SocketEventEmitter, SocketRoomService],
  exports: [CommunicationGateway, SocketEventEmitter, SocketRoomService],
})
export class SocketModule {}
