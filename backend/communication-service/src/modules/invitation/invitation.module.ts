import { Module } from '@nestjs/common';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketModule } from '../socket/socket.module';
import { MessageModule } from '../message/message.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { InvitationPublisher } from './events/invitation.publisher';

@Module({
  imports: [
    PrismaModule,
    SocketModule,
    MessageModule,
    KafkaProducerModule,
    UserProfileSnapshotModule,
  ],
  controllers: [InvitationController],
  providers: [InvitationService, InvitationPublisher],
  exports: [InvitationService],
})
export class InvitationModule {}
