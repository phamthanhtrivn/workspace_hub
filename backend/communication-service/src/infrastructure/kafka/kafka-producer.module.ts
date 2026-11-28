import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { DurableKafkaProducer } from './durable-kafka-producer';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: 'KAFKA_PRODUCER',
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new DurableKafkaProducer(prisma, {
          producerOnlyMode: true,
          client: {
            clientId: 'communication-service-producer',
            brokers: [process.env.KAFKA_BROKER!],
          },
        }),
    },
  ],
  exports: ['KAFKA_PRODUCER'],
})
export class KafkaProducerModule {}
