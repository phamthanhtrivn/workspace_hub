import { INestApplication } from '@nestjs/common';
import { getKafkaConfig } from '../kafka/kafka.config';
import { KAFKA_CONFIG } from '../kafka/kafka.constants';
import { logger } from '../logger/bootstrap-logger';

export async function setupMicroservices(app: INestApplication): Promise<void> {
  app.connectMicroservice(getKafkaConfig());

  await app
    .startAllMicroservices()
    .then(() => {
      logger.log(KAFKA_CONFIG.LOG_MESSAGES.CONSUMER_STARTED);
    })
    .catch((error: unknown) => {
      logger.error(
        KAFKA_CONFIG.LOG_MESSAGES.CONSUMER_START_FAILED,
        error instanceof Error ? error.stack : String(error),
      );
    });
}
