import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RuntimeConfigService } from './common/config/runtime-config.service';
import { setupMicroservices } from './infrastructure/bootstrap/microservices.bootstrap';
import { logger } from './infrastructure/logger/bootstrap-logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(RuntimeConfigService);

  app.enableCors({
    origin: config.corsAllowedOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  await setupMicroservices(app);

  const port = Number(process.env.PORT ?? 8082);
  await app.listen(port, '0.0.0.0');
  logger.log(`Project service HTTP server started on ${port}`);
}

void bootstrap();
