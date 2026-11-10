"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteNotification,
  deleteNotifications,
} from "../api/notification.api";
import type {
  NotificationCategory,
  NotificationDateRange,
} from "../types/notification.types";
import { useAppDispatch } from "@/store/store";
import { deleteNotificationSuccess } from "@/store/notification/notification.slice";
import { notificationKeys } from "../types/notification.query-keys";

export { notificationKeys } from "../types/notification.query-keys";

interface DeleteNotificationsMutationPayload {
  category?: NotificationCategory;
  isRead?: boolean;
  dateRange?: NotificationDateRange;
}

export function useNotificationActions({
  onNotificationsChanged,
}: {
  onNotificationsChanged?: () => void;
} = {}) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const invalidateNotificationQueries = () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.root });
    onNotificationsChanged?.();
  };

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: (_, notificationId) => {
      dispatch(deleteNotificationSuccess(notificationId));
      invalidateNotificationQueries();
    },
  });

  const deleteNotificationsMutation = useMutation({
    mutationFn: (payload?: DeleteNotificationsMutationPayload) =>
      deleteNotifications(payload?.category ?? "ALL", {
        isRead: payload?.isRead,
        dateRange: payload?.dateRange,
      }),
    onSuccess: () => {
      invalidateNotificationQueries();
    },
  });

  return {
    deleteNotificationMutation,
    deleteNotificationsMutation,
    deletingNotificationId: deleteNotificationMutation.isPending
      ? deleteNotificationMutation.variables
      : null,
  };
}
