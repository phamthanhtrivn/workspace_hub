import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { ChatModule } from '../chat/chat.module';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { DirectMessageController } from './direct-message.controller';
import { DirectMessageService } from './direct-message.service';

@Module({
  imports: [PrismaModule, S3Module, KafkaProducerModule, forwardRef(() => ChatModule)],
  controllers: [DirectMessageController],
  providers: [DirectMessageService],
  exports: [DirectMessageService],
})
export class DirectMessageModule {}
