import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { MessageModule } from '../message/message.module';



@Module({
  imports: [PrismaModule, MessageModule],
  controllers: [],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
