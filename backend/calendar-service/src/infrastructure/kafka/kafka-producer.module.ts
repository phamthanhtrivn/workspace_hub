import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { getKafkaBrokers } from './kafka.config';
import { KAFKA_CONFIG } from './kafka.constants';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: KAFKA_CONFIG.PRODUCER_CLIENT,
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'calendar-service-producer',
            brokers: getKafkaBrokers(),
          },
          producerOnlyMode: true,
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaProducerModule {}
