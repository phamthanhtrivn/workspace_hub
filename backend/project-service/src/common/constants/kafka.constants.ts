export const KAFKA_TOPICS = {
  NOTIFICATION_TOPIC: 'notification-topic',
  USER_PROFILE_EVENTS: 'user-profile-events',
} as const;

export const KAFKA_EVENTS = {
  NOTIFICATION: {
    PROJECT_INVITATION: 'PROJECT_INVITATION',
    PROJECT_TASK_ASSIGNED: 'PROJECT_TASK_ASSIGNED',
    PROJECT_TASK_UPDATED: 'PROJECT_TASK_UPDATED',
  },
} as const;

export const KAFKA_CLIENTS = {
  PROJECT_SERVICE: {
    CLIENT_ID: 'project-service-producer',
  },
  NOTIFICATION_SERVICE: {
    CLIENT_ID: 'notification-service',
    GROUP_ID: 'notification-service-group',
  },
} as const;
