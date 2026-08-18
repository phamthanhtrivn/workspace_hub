import { Module, forwardRef } from '@nestjs/common';
import { ChannelController } from './channel.controller';
import { ChatModule } from '../chat/chat.module';
import { MessageModule } from '../message/message.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { ChannelService } from './channel.service';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';

@Module({
  imports: [
    forwardRef(() => ChatModule),
    forwardRef(() => MessageModule),
    PrismaModule,
    S3Module,
    UserProfileSnapshotModule,
    KafkaProducerModule,
  ],
  controllers: [ChannelController],
  providers: [ChannelService],
  exports: [ChannelService],
})
export class ChannelModule {}
