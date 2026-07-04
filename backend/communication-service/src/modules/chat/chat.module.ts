import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { MessageModule } from '../message/message.module';
import { NotificationConsumerController } from './notification-consumer.controller';

@Module({
  imports: [PrismaModule, MessageModule],
  controllers: [NotificationConsumerController],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
