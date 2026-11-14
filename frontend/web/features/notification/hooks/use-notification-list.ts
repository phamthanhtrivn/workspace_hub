"use client";

import { useEffect, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAppDispatch } from "@/store/store";
import { setNotifications } from "@/store/notification/notification.slice";
import { logApiError } from "@/lib/interceptors";
import {
  notificationListOptions,
  type NotificationListFilters,
} from "../api/notification-list.api";
import { getNotificationFeed } from "../utils/notification-feed";
import { NOTIFICATION_CHANGED_EVENT } from "../utils/notification-category.utils";

export function useNotificationList(
  filters: NotificationListFilters,
  enabled: boolean,
) {
  const dispatch = useAppDispatch();
  const query = useInfiniteQuery({
    ...notificationListOptions(filters),
    enabled,
  });
  const { refetch } = query;
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      void refetch({ cancelRefetch: false });
    };
    window.addEventListener(NOTIFICATION_CHANGED_EVENT, refresh);

    return () =>
      window.removeEventListener(NOTIFICATION_CHANGED_EVENT, refresh);
  }, [enabled, refetch]);
  const feed = useMemo(
    () =>
      getNotificationFeed(
        query.data?.pages ?? [],
        filters.category,
        filters.dateRange,
      ),
    [query.data, filters.category, filters.dateRange],
  );

  useEffect(() => {
    if (enabled && feed.snapshot) dispatch(setNotifications(feed.snapshot));
  }, [dispatch, enabled, feed.snapshot]);

  useEffect(() => {
    if (query.error) logApiError(query.error, "Failed to fetch notifications");
  }, [query.error]);

  return {
    ...feed,
    loading: enabled && query.isPending,
    listError: query.isError && !query.isFetchNextPageError,
    loadMoreError: query.isFetchNextPageError,
    isFetching: query.isFetching,
    isLoadingMore: query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),
    loadMore: () => {
      if (query.hasNextPage && !query.isFetching)
        void query.fetchNextPage({ cancelRefetch: false });
    },
    refresh: () => query.refetch({ cancelRefetch: false }),
  };
}
