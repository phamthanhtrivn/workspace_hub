import * as dotenv from "dotenv";
// Load environment variables from .env file before anything else
dotenv.config();

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ValidationPipe } from "@nestjs/common";
import { KAFKA_CLIENTS } from "./common/constants/kafka.constants";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Response Interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Connect Kafka Microservice for receiving background notifications
  const kafkaBroker = process.env.KAFKA_BROKER!;
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

  await app.startAllMicroservices();

  const port = process.env.PORT!;
  await app.listen(port);
}
bootstrap();
