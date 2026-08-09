import { Module, forwardRef } from '@nestjs/common';
import { ConversationController } from './channel.controller';
import { ChatModule } from '../chat/chat.module';
import { MessageModule } from '../message/message.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { ChannelService } from './channel.service';

@Module({
  imports: [
    forwardRef(() => ChatModule),
    forwardRef(() => MessageModule),
    PrismaModule,
    S3Module,
  ],
  controllers: [ConversationController],
  providers: [ChannelService],
  exports: [ChannelService],
})
export class ChannelModule {}
