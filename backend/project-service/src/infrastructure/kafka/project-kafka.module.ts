import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KAFKA_CLIENTS } from '../../common/constants/kafka.constants';

export const PROJECT_KAFKA_CLIENT = 'PROJECT_KAFKA_CLIENT';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: PROJECT_KAFKA_CLIENT,
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: KAFKA_CLIENTS.PROJECT_SERVICE.CLIENT_ID,
            brokers: (process.env.KAFKA_BROKER ?? 'localhost:9092')
              .split(',')
              .map((broker) => broker.trim())
              .filter(Boolean),
            connectionTimeout: 10_000,
            requestTimeout: 30_000,
            retry: {
              initialRetryTime: 300,
              retries: 8,
            },
          },
          producerOnlyMode: true,
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class ProjectKafkaModule {}
