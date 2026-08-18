export const KAFKA_CONFIG = {
  TOPIC: 'user-profile-events',
  CLIENT_ID: 'document-profile-snapshot-consumer',
  GROUP_ID: 'document-profile-snapshot-group',
  BROKER_ENV: 'KAFKA_BROKER',
  DEFAULT_BROKER: 'localhost:9092',
  LOG_MESSAGES: {
    CONSUMER_STARTED: 'User profile snapshot consumer started',
    CONSUMER_START_FAILED: 'User profile snapshot consumer failed to start',
  },
} as const;
