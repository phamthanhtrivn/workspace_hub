import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

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
            clientId: 'project-task-calendar-producer',
            brokers: (process.env.KAFKA_BROKER ?? 'localhost:9092')
              .split(',')
              .map((broker) => broker.trim())
              .filter(Boolean),
          },
          producerOnlyMode: true,
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class ProjectKafkaModule {}
