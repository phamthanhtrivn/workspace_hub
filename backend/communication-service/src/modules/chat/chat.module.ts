import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { MessageModule } from '../message/message.module';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { PollModule } from '../poll/poll.module';
import { NoteModule } from '../note/note.module';
import { DirectMessageModule } from '../direct-message/direct-message.module';

@Module({
  imports: [
    PrismaModule,
    MessageModule,
    KafkaProducerModule,
    PollModule,
    NoteModule,
    DirectMessageModule,
  ],
  controllers: [],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
