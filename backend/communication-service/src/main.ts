import { loadServiceEnvironment } from './common/config/load-service-env';
loadServiceEnvironment();

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { logger } from './infrastructure/logger/bootstrap-logger';
import { setupMicroservices } from './infrastructure/bootstrap/microservices.bootstrap';
import { socketCorsOptions } from './common/auth/socket-origin';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const port = process.env.PORT ?? '8083';
  app.enableShutdownHooks();
  // Prisma revisions are bigint; expose them losslessly in JSON responses.
  app.set('json replacer', (_key: string, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value,
  );

  app.useBodyParser('json', {
    type: ['application/json', 'application/*+json'],
  });

  // Enable CORS
  app.enableCors({
    ...socketCorsOptions,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Setup Global Pipes, Interceptors, and Filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      exceptionFactory: (errors) => {
        const formatErrors = (errors: ValidationError[]) => {
          const result: Record<string, unknown> = {};
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

  // Setup Redis WebSocket Adapter and Kafka Microservice
  await setupMicroservices(app);

  await app.listen(port);
  logger.log(`Communication service HTTP server started on ${port}`);
}
void bootstrap();
