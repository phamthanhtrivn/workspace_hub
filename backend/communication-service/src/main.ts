import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { Transport } from '@nestjs/microservices';
import { USER_PROFILE_SNAPSHOT_KAFKA } from './modules/user-profile-snapshot/types/user-profile-snapshot.constants';

async function bootstrap() {
  const logger = new Logger('CommunicationBootstrap');
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? '8083';
  const kafkaBrokers = (
    process.env[USER_PROFILE_SNAPSHOT_KAFKA.BROKER_ENV] ??
    USER_PROFILE_SNAPSHOT_KAFKA.DEFAULT_BROKER
  )
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: USER_PROFILE_SNAPSHOT_KAFKA.CLIENT_ID,
        brokers: kafkaBrokers,
      },
      consumer: {
        groupId: USER_PROFILE_SNAPSHOT_KAFKA.GROUP_ID,
      },
    },
  });

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

  await app.listen(port);
  logger.log(`Communication service HTTP server started on ${port}`);

  void app
    .startAllMicroservices()
    .then(() => {
      logger.log(USER_PROFILE_SNAPSHOT_KAFKA.LOG_MESSAGES.CONSUMER_STARTED);
    })
    .catch((error) => {
      logger.error(
        USER_PROFILE_SNAPSHOT_KAFKA.LOG_MESSAGES.CONSUMER_START_FAILED,
        error instanceof Error ? error.stack : String(error),
      );
    });
}
bootstrap();
