import { Module } from '@nestjs/common';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { ChatModule } from '../chat/chat.module';
import { KafkaProducerModule } from '../../common/kafka/kafka-producer.module';

@Module({
  imports: [ChatModule, KafkaProducerModule],
  controllers: [ConversationController],
  providers: [ConversationService]
})
export class ConversationModule {}
