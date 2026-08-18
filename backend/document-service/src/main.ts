/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { logger } from './infrastructure/logger/bootstrap-logger';
import { setupMicroservices } from './infrastructure/bootstrap/microservices.bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
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

  await setupMicroservices(app);

  const port = process.env.PORT!;
  await app.listen(port);
  logger.log(`Document service HTTP server started on ${port}`);
}
void bootstrap();
