export const KAFKA_TOPICS = {
  // Topic where other services publish raw notifications to be persisted
  NOTIFICATION_TOPIC: 'notification-topic',
  
  // Topic where notification-service publishes saved notifications for real-time WebSocket delivery
  REALTIME_NOTIFICATION_TOPIC: 'realtime-notification-topic',
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
