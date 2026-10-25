import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketModule } from '../socket/socket.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { ConversationAiService } from './conversation-ai.service';
import { ConversationAiController } from './conversation-ai.controller';
@Module({
  imports: [PrismaModule, S3Module, forwardRef(() => SocketModule)],
  providers: [ConversationAiService],
  controllers: [ConversationAiController],
  exports: [ConversationAiService],
})
export class ConversationAiModule {}
