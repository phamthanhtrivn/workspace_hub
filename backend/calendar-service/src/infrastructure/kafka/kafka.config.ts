import { KafkaOptions, Transport } from '@nestjs/microservices';
import { KAFKA_CONFIG } from './kafka.constants';

export const getKafkaConfig = (): KafkaOptions => {
  const kafkaBrokers = (
    process.env[KAFKA_CONFIG.BROKER_ENV] ?? KAFKA_CONFIG.DEFAULT_BROKER
  )
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);

  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: KAFKA_CONFIG.CLIENT_ID,
        brokers: kafkaBrokers,
      },
      consumer: {
        groupId: KAFKA_CONFIG.GROUP_ID,
      },
    },
  };
};
