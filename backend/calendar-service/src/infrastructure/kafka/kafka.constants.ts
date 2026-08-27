export const KAFKA_CONFIG = {
  TOPIC: 'user-profile-events',
  REMINDER_TOPIC: 'calendar-reminder-events',
  TASK_TOPIC: 'project-task-events',
  PRODUCER_CLIENT: 'CALENDAR_KAFKA_PRODUCER',
  CLIENT_ID: 'calendar-profile-snapshot-consumer',
  GROUP_ID: 'calendar-profile-snapshot-group',
  BROKER_ENV: 'KAFKA_BROKER',
  DEFAULT_BROKER: 'localhost:9092',
  LOG_MESSAGES: {
    CONSUMER_STARTED: 'User profile snapshot consumer started',
    CONSUMER_START_FAILED: 'User profile snapshot consumer failed to start',
  },
} as const;
