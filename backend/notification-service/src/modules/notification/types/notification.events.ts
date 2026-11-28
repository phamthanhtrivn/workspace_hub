export const NotificationEvent = {
  CREATED: "new_notification",
  CHANGED: "notifications_changed",
  UPDATED: "notification_updated",
  DELETED: "notification_deleted",
  BATCH_DELETED: "notifications_deleted",
} as const;

export type NotificationEventName =
  (typeof NotificationEvent)[keyof typeof NotificationEvent];
