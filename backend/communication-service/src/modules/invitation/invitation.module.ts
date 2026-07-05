import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { KafkaProducerModule } from '../../common/kafka/kafka-producer.module';

@Module({
  imports: [PrismaModule, ChatModule, KafkaProducerModule],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
