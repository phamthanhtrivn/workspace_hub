import { Module } from '@nestjs/common';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketModule } from '../socket/socket.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { SpaceController } from './space.controller';
import { SpaceService } from './space.service';

@Module({
  imports: [
    PrismaModule,
    KafkaProducerModule,
    SocketModule,
    UserProfileSnapshotModule,
  ],
  controllers: [SpaceController],
  providers: [SpaceService],
  exports: [SpaceService],
})
export class SpaceModule {}
