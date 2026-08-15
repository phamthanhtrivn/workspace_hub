export const USER_PROFILE_SNAPSHOT_KAFKA = {
  TOPIC: 'user-profile-events',
  CLIENT_ID: 'communication-profile-snapshot-consumer',
  GROUP_ID: 'communication-profile-snapshot-group',
  BROKER_ENV: 'KAFKA_BROKER',
  DEFAULT_BROKER: 'localhost:9092',
  LOG_MESSAGES: {
    CONSUMER_STARTED: 'User profile snapshot consumer started',
    CONSUMER_START_FAILED: 'User profile snapshot consumer failed to start',
  },
} as const;

export const USER_PROFILE_SNAPSHOT_FIELDS = {
  USER_ID: 'userId',
  EMAIL: 'email',
  FULL_NAME: 'fullName',
  AVATAR_URL: 'avatarUrl',
  OCCURRED_AT: 'occurredAt',
  EVENT_TYPE: 'eventType',
} as const;
