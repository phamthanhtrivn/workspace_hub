import { TrackedKafkaServer } from '../kafka/tracked-kafka.server';
import { INestApplication } from '@nestjs/common';
import { getKafkaConfig } from '../kafka/kafka.config';
import { KAFKA_CONFIG } from '../kafka/kafka.constants';
import { logger } from '../logger/bootstrap-logger';

export async function setupMicroservices(app: INestApplication): Promise<void> {
  // Connect Kafka Microservice
  app.connectMicroservice({ strategy: new TrackedKafkaServer(getKafkaConfig().options ?? {}) });

  // Start microservices
  await app
    .startAllMicroservices()
    .then(() => {
      logger.log(KAFKA_CONFIG.LOG_MESSAGES.CONSUMER_STARTED);
    })
    .catch((error: unknown) => {
      logger.error(
        KAFKA_CONFIG.LOG_MESSAGES.CONSUMER_START_FAILED,
        'Required Kafka consumer could not start',
      );
      throw error;
    });
}
