import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { KafkaProducerModule } from '../../common/kafka/kafka-producer.module';
import { ChatModule } from '../chat/chat.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [PrismaModule, KafkaProducerModule, ChatModule, MessageModule],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
