import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_CLIENTS } from './common/constants/kafka.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Connect Kafka Microservice for receiving realtime notification events
  const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: KAFKA_CLIENTS.COMMUNICATION_SERVICE.CLIENT_ID,
        brokers: [kafkaBroker],
      },
      consumer: {
        groupId: KAFKA_CLIENTS.COMMUNICATION_SERVICE.GROUP_ID,
      },
    },
  });

  await app.startAllMicroservices();
  console.log(`Communication Kafka Microservice is listening on broker: ${kafkaBroker}`);


  // Setup Global Pipes, Interceptors, and Filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      exceptionFactory: (errors) => {
        const formatErrors = (errors: any[]) => {
          const result: any = {};
          errors.forEach((error) => {
            if (error.constraints) {
              result[error.property] = Object.values(error.constraints)[0];
            } else if (error.children && error.children.length > 0) {
              result[error.property] = formatErrors(error.children);
            }
          });
          return result;
        };
        return new BadRequestException({
          message: 'Validation failed',
          errors: formatErrors(errors),
        });
      },
    }),
  );
  
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Setup Redis WebSocket Adapter
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(process.env.PORT ?? 8083);
}
bootstrap();
