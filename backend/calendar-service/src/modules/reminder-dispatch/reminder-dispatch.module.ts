import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KAFKA_CONFIG } from '../../infrastructure/kafka/kafka.constants';
import { getKafkaBrokers } from '../../infrastructure/kafka/kafka.config';
import { ReminderDispatchService } from './reminder-dispatch.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: KAFKA_CONFIG.PRODUCER_CLIENT,
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'calendar-reminder-producer',
            brokers: getKafkaBrokers(),
          },
          producerOnlyMode: true,
        },
      },
    ]),
  ],
  providers: [ReminderDispatchService],
})
export class ReminderDispatchModule {}
