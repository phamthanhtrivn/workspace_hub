import { Module } from '@nestjs/common';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketModule } from '../socket/socket.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';
import { HttpJsonClient } from '../../common/adapters/http-json.client';
import { SpaceController } from './space.controller';
import { ProjectNameClient } from './project-name.client';
import { SpaceService } from './space.service';

@Module({
  imports: [
    PrismaModule,
    KafkaProducerModule,
    SocketModule,
    UserProfileSnapshotModule,
  ],
  controllers: [SpaceController],
  providers: [SpaceService, ProjectNameClient, HttpJsonClient],
  exports: [SpaceService],
})
export class SpaceModule {}
