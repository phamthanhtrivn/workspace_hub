import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { DirectConversationController } from './direct-conversation.controller';
import { DirectConversationService } from './direct-conversation.service';

@Module({
  imports: [forwardRef(() => ChatModule), PrismaModule],
  controllers: [DirectConversationController],
  providers: [DirectConversationService],
  exports: [DirectConversationService],
})
export class DirectConversationModule {}
