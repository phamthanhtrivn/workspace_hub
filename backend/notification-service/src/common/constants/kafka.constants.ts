export const KAFKA_TOPICS = {
  // Topic where other services publish raw notifications to be persisted
  NOTIFICATION_TOPIC: 'notification-topic',
  CALENDAR_REMINDER_TOPIC: 'calendar-reminder-events',
  PROJECT_NOTIFICATION_TOPIC: 'project-notification-events',
  PROJECT_NOTIFICATION_RETRY_TOPIC: 'project-notification-events-retry',
  PROJECT_NOTIFICATION_DLT_TOPIC: 'project-notification-events-dlt',
};

export const KAFKA_EVENTS = {
  NOTIFICATION: {
    SPACE_INVITATION: 'SPACE_INVITATION',
    SPACE_INVITATION_ACCEPTED: 'SPACE_INVITATION_ACCEPTED',
    SPACE_INVITATION_DECLINED: 'SPACE_INVITATION_DECLINED',
    SPACE_DISBANDED: 'SPACE_DISBANDED',
    SPACE_MEMBER_REMOVED: 'SPACE_MEMBER_REMOVED',
    CHANNEL_DISBANDED: 'CHANNEL_DISBANDED',
    SPACE_OWNERSHIP_TRANSFERRED: 'SPACE_OWNERSHIP_TRANSFERRED',
    CALENDAR_REMINDER: 'CALENDAR_REMINDER',
  },
};

export const KAFKA_CLIENTS = {
  NOTIFICATION_SERVICE: {
    CLIENT_ID: 'notification-service',
    GROUP_ID: 'notification-service-group',
  },
  COMMUNICATION_SERVICE: {
    CLIENT_ID: 'communication-service',
    GROUP_ID: 'communication-service-group',
  },
  NOTIFICATION_RETRY_PRODUCER: {
    CLIENT_ID: 'notification-retry-producer',
  },
};

export const NOTIFICATION_RETRY_KAFKA_CLIENT =
  'NOTIFICATION_RETRY_KAFKA_CLIENT';
