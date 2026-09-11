"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteNotification,
  deleteNotifications,
} from "../api/notification.api";
import type { NotificationCategory } from "../types/notification.types";
import { useAppDispatch } from "@/store/store";
import {
  deleteNotificationSuccess,
} from "@/store/notification/notification.slice";

export const notificationKeys = {
  root: ["notifications"] as const,
  lists: () => [...notificationKeys.root, "list"] as const,
  unreadCount: () => [...notificationKeys.root, "unread-count"] as const,
};

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
    mutationFn: (category?: NotificationCategory) =>
      deleteNotifications(category ?? "ALL"),
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
