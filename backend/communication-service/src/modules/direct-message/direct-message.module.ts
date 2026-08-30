import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { SocketModule } from '../socket/socket.module';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { DirectMessageController } from './direct-message.controller';
import { DirectMessageService } from './direct-message.service';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';

@Module({
  imports: [
    PrismaModule,
    S3Module,
    KafkaProducerModule,
    UserProfileSnapshotModule,
    forwardRef(() => SocketModule),
  ],
  controllers: [DirectMessageController],
  providers: [DirectMessageService],
  exports: [DirectMessageService],
})
export class DirectMessageModule {}
