import type {
  GetNotificationsResponse,
  NotificationCategory,
  NotificationDateRange,
  NotificationUnreadCountsByCategory,
} from "../types/notification.types";
import { getNotificationSnapshot } from "./notification-snapshot";

const EMPTY_UNREAD_COUNTS: NotificationUnreadCountsByCategory = {
  ALL: 0,
  PROJECT: 0,
  CHAT: 0,
  CALENDAR: 0,
  MEETING: 0,
  DOCUMENT: 0,
};

export function getNotificationFeed(
  pages: GetNotificationsResponse[],
  category: NotificationCategory,
  dateRange: NotificationDateRange,
) {
  const latest = pages.at(-1);
  const seen = new Set<string>();
  const list = pages
    .flatMap((page) => page.data)
    .filter((notification) => {
      if (seen.has(notification.id)) return false;
      seen.add(notification.id);

      return true;
    });
  const unreadCountsByCategory = latest?.pagination.unreadCountsByCategory ?? {
    ...EMPTY_UNREAD_COUNTS,
    ALL: latest?.pagination.unreadCount ?? 0,
    [category]:
      latest?.pagination.categoryUnreadCount ??
      latest?.pagination.unreadCount ??
      0,
  };

  return {
    list,
    total: latest?.pagination.total ?? 0,
    unreadCountsByCategory,
    snapshot: latest
      ? { ...getNotificationSnapshot(latest, dateRange), list }
      : null,
  };
}
