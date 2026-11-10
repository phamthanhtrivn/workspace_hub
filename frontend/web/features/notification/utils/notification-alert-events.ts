import {
  NotificationType,
  type Notification,
} from "../types/notification.types";
import { NOTIFICATION_RECEIVED_EVENT } from "./notification-category.utils";

const MAX_REMEMBERED_NOTIFICATIONS = 1000;
const SPACE_NOTIFICATION_TYPES = new Set<string>([
  NotificationType.SPACE_INVITATION,
  NotificationType.SPACE_INVITATION_ACCEPTED,
  NotificationType.SPACE_INVITATION_DECLINED,
  NotificationType.SPACE_DISBANDED,
  NotificationType.SPACE_MEMBER_REMOVED,
  NotificationType.CHANNEL_DISBANDED,
]);

export function listenForNotificationAlerts(
  target: EventTarget,
  seen: Set<string>,
  enabled: boolean,
  alert: () => void,
) {
  const onReceived = (event: Event) => {
    const notification = (event as CustomEvent<Notification>).detail;
    if (
      !notification ||
      typeof notification.id !== "string" ||
      seen.has(notification.id)
    )
      return;
    seen.add(notification.id);
    if (seen.size > MAX_REMEMBERED_NOTIFICATIONS)
      seen.delete(seen.values().next().value!);
    if (
      enabled &&
      !notification.isRead &&
      SPACE_NOTIFICATION_TYPES.has(notification.type)
    )
      alert();
  };
  target.addEventListener(NOTIFICATION_RECEIVED_EVENT, onReceived);

  return () =>
    target.removeEventListener(NOTIFICATION_RECEIVED_EVENT, onReceived);
}
