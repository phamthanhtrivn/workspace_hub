import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { MessageModule } from '../message/message.module';
import { PollModule } from '../poll/poll.module';
import { NoteModule } from '../note/note.module';

@Module({
  imports: [PrismaModule, MessageModule, PollModule, NoteModule],
  controllers: [],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
