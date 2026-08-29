import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { MessageModule } from '../message/message.module';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { PollModule } from '../poll/poll.module';
import { NoteModule } from '../note/note.module';
import { DirectMessageModule } from '../direct-message/direct-message.module';
import { SocketAuthService } from '../../infrastructure/realtime/socket-auth.service';
import { MeetingRealtimeHandler } from '../meeting/realtime/meeting-realtime.handler';

@Module({
  imports: [
    PrismaModule,
    MessageModule,
    KafkaProducerModule,
    PollModule,
    NoteModule,
    forwardRef(() => DirectMessageModule),
  ],
  controllers: [],
  providers: [ChatGateway, SocketAuthService, MeetingRealtimeHandler],
  exports: [ChatGateway],
})
export class ChatModule {}
