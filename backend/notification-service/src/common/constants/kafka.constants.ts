export const KAFKA_TOPICS = {
  // Topic where other services publish raw notifications to be persisted
  NOTIFICATION_TOPIC: 'notification-topic',
};

export const KAFKA_EVENTS = {
  NOTIFICATION: {
    CHAT_GROUP_INVITATION: 'CHAT_GROUP_INVITATION',
    CHAT_INVITATION_ACCEPTED: 'CHAT_INVITATION_ACCEPTED',
    CHAT_INVITATION_DECLINED: 'CHAT_INVITATION_DECLINED',
  }
};

export const KAFKA_CLIENTS = {
  NOTIFICATION_SERVICE: {
    CLIENT_ID: 'notification-service',
    GROUP_ID: 'notification-service-group',
  },
  COMMUNICATION_SERVICE: {
    CLIENT_ID: 'communication-service',
    GROUP_ID: 'communication-service-notification-group',
  },
};
