import { infiniteQueryOptions } from "@tanstack/react-query";
import { getNotifications } from "./notification.api";
import { notificationKeys } from "../types/notification.query-keys";
import type {
  NotificationCategory,
  NotificationDateRange,
  NotificationReadFilter,
} from "../types/notification.types";
import { getReadFilterValue } from "../utils/notification-display.utils";

export const NOTIFICATION_PAGE_SIZE = 10;

export interface NotificationListFilters {
  viewerId: string | null;
  category: NotificationCategory;
  readFilter: NotificationReadFilter;
  dateRange: NotificationDateRange;
}

export function notificationListOptions(filters: NotificationListFilters) {
  return infiniteQueryOptions({
    queryKey: [
      ...notificationKeys.lists(),
      "bell",
      filters.viewerId,
      filters.category,
      filters.readFilter,
      filters.dateRange.fromDate ?? null,
      filters.dateRange.toDate ?? null,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getNotifications(
        pageParam,
        NOTIFICATION_PAGE_SIZE,
        getReadFilterValue(filters.readFilter),
        filters.category,
        filters.dateRange,
        signal,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    // Keep pages while the bell is closed; discard a filter's pages after switching away.
    gcTime: 0,
    retry: false,
  });
}
