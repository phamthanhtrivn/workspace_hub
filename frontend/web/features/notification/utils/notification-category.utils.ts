import {
  Notification,
  NotificationCategory,
  NotificationType,
} from "../types/notification.types";

export const NOTIFICATION_CHANGED_EVENT = "workspacehub:notification-changed";

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "ALL",
  "PROJECT",
  "CHAT",
  "CALENDAR",
  "MEETING",
  "DOCUMENT",
];

const PROJECT_TYPES = new Set<string>([
  NotificationType.PROJECT_INVITATION,
  NotificationType.PROJECT_TASK_ASSIGNED,
  NotificationType.PROJECT_TASK_UPDATED,
  NotificationType.PROJECT_SPRINT_STARTED,
]);

const CHAT_TYPES = new Set<string>([
  NotificationType.SPACE_INVITATION,
  NotificationType.SPACE_INVITATION_ACCEPTED,
  NotificationType.SPACE_INVITATION_DECLINED,
  NotificationType.SPACE_DISBANDED,
  NotificationType.SPACE_MEMBER_REMOVED,
  NotificationType.SPACE_OWNERSHIP_TRANSFERRED,
  NotificationType.CHANNEL_DISBANDED,
  NotificationType.CHAT_GROUP_INVITATION,
  NotificationType.CHAT_INVITATION_ACCEPTED,
  NotificationType.CHAT_INVITATION_DECLINED,
]);

const CALENDAR_TYPES = new Set<string>([NotificationType.CALENDAR_REMINDER]);

const MEETING_TYPES = new Set<string>([
  NotificationType.MEETING_INVITATION,
  NotificationType.MEETING_INVITATION_STATUS,
  NotificationType.MEETING_INVITATION_DECLINED,
  NotificationType.MEETING_UPDATED,
  NotificationType.MEETING_CANCELLED,
]);

export function getNotificationCategory(
  notification: Pick<Notification, "type" | "link">,
): NotificationCategory {
  if (PROJECT_TYPES.has(notification.type)) return "PROJECT";
  if (CHAT_TYPES.has(notification.type)) return "CHAT";
  if (CALENDAR_TYPES.has(notification.type)) return "CALENDAR";
  if (MEETING_TYPES.has(notification.type)) return "MEETING";
  if (
    notification.type.startsWith("DOCUMENT_") ||
    notification.link?.startsWith("/documents")
  ) {
    return "DOCUMENT";
  }
  return "ALL";
}

export function isNotificationInCategory(
  notification: Pick<Notification, "type" | "link">,
  category: NotificationCategory,
): boolean {
  return category === "ALL" || getNotificationCategory(notification) === category;
}
