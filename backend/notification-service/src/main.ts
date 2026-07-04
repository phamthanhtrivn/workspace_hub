import * as dotenv from 'dotenv';
// Load environment variables from .env file before anything else
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { KAFKA_CLIENTS } from './common/constants/kafka.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Connect Kafka Microservice for receiving background notifications
  const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: KAFKA_CLIENTS.NOTIFICATION_SERVICE.CLIENT_ID,
        brokers: [kafkaBroker],
      },
      consumer: {
        groupId: KAFKA_CLIENTS.NOTIFICATION_SERVICE.GROUP_ID,
      },
    },
  });

  // Start microservices
  await app.startAllMicroservices();
  console.log(`Notification Kafka Microservice is listening on broker: ${kafkaBroker}`);

  // Start HTTP REST API
  const port = process.env.PORT || 8084;
  await app.listen(port);
  console.log(`Notification HTTP REST API is listening on port: ${port}`);
}
bootstrap();
