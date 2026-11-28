import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketPublishingModule } from '../socket/socket-publishing.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { PrivateChannelService } from './private-channel.service';
import { PrivateChannelMembersService } from './private-channel-members.service';

@Global()
@Module({
  imports: [
    PrismaModule,
    SocketPublishingModule,
    UserProfileSnapshotModule,
    KafkaProducerModule,
  ],
  providers: [PrivateChannelService, PrivateChannelMembersService],
  exports: [PrivateChannelService, PrivateChannelMembersService],
})
export class PrivateChannelModule {}
