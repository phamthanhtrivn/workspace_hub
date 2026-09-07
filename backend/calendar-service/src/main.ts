/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import * as dotenv from 'dotenv';
dotenv.config();

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { setupMicroservices } from './infrastructure/bootstrap/microservices.bootstrap';
import { logger } from './infrastructure/logger/bootstrap-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? '8086';

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const formatErrors = (validationErrors: any[]) => {
          const result: Record<string, unknown> = {};
          validationErrors.forEach((error) => {
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

  await setupMicroservices(app);

  await app.listen(port);
  logger.log(`Calendar service HTTP server started on ${port}`);
}

void bootstrap();
