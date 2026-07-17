import { Module, forwardRef } from '@nestjs/common';
import { ConversationController } from './controllers/conversation.controller';
import { InvitationController } from './controllers/invitation.controller';
import { ConversationService } from './services/conversation.service';
import { InvitationService } from './services/invitation.service';
import { ChatModule } from '../chat/chat.module';
import { MessageModule } from '../message/message.module';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { ConversationEventPublisher } from './events/conversation.publisher';

@Module({
  imports: [forwardRef(() => ChatModule), forwardRef(() => MessageModule), KafkaProducerModule],
  controllers: [ConversationController, InvitationController],
  providers: [ConversationService, InvitationService, ConversationEventPublisher],
  exports: [ConversationService]
})
export class ConversationModule {}
