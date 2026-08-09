import { Module } from '@nestjs/common';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SpaceController } from './space.controller';
import { SpaceService } from './space.service';

@Module({
  imports: [PrismaModule, KafkaProducerModule],
  controllers: [SpaceController],
  providers: [SpaceService],
  exports: [SpaceService],
})
export class SpaceModule {}
