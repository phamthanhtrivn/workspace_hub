import type {
  GetNotificationsResponse,
  NotificationDateRange,
} from "../types/notification.types";

export function getNotificationSnapshot(
  response: GetNotificationsResponse,
  dateRange: NotificationDateRange = {},
) {
  return {
    list: response.data,
    total: response.pagination.total,
    // Date-filtered counts belong to the dropdown, not the global bell badge.
    ...(!dateRange.fromDate && !dateRange.toDate
      ? { unreadCount: response.pagination.unreadCount }
      : {}),
  };
}
