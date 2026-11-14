import {
  NotificationType,
  type Notification,
} from "../types/notification.types";

export const CALENDAR_REMINDER_ALERT_COPY = {
  open: "Open",
  title: "Calendar reminder",
} as const;
const MAX_REMEMBERED_REMINDERS = 1000;

/** Consume only live PUSH signals, not ALERT/history/reconciliation events. */
export function consumeCalendarPush(
  notification: Notification,
  seen: Set<string>,
  visible: boolean,
  focused: boolean,
): boolean {
  if (
    notification.type !== NotificationType.CALENDAR_REMINDER ||
    !(
      notification.metadata?.method === "PUSH" ||
      (Array.isArray(notification.metadata?.channels) &&
        notification.metadata.channels.includes("PUSH"))
    )
  )
    return false;
  const key =
    typeof notification.metadata?.groupKey === "string"
      ? `${notification.recipientId}:${notification.metadata.groupKey}`
      : notification.id;
  if (seen.has(key)) return false;
  seen.add(key);
  if (seen.size > MAX_REMEMBERED_REMINDERS)
    seen.delete(seen.values().next().value!);

  // Consume background signals too; never announce them later on focus.
  return visible && focused;
}
