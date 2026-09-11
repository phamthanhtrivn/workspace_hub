import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RootState, useAppDispatch, useAppSelector } from "@/store/store";
import {
  BACKEND_HEALTH_PATHS,
  waitForBackendReady,
} from "@/lib/backend-readiness";
import { notificationSocketService } from "../api/notification-socket.service";
import {
  addNotification,
  deleteNotificationSuccess,
  deleteNotificationsSuccess,
  updateNotificationSuccess,
} from "@/store/notification/notification.slice";
import { chatKeys } from "@/features/chat/types/chat.constant";
import { meetingKeys } from "@/features/meeting/types/meeting.query-keys";
import {
  getNotificationCategory,
  NOTIFICATION_CHANGED_EVENT,
} from "../utils/notification-category.utils";
import {
  NotificationType,
  Notification as AppNotification,
} from "../types/notification.types";

interface NotificationsDeletedPayload {
  category: ReturnType<typeof getNotificationCategory>;
  deletedCount: number;
  unreadDeletedCount: number;
}

const MEETING_NOTIFICATION_TYPES = new Set<NotificationType>([
  NotificationType.MEETING_INVITATION,
  NotificationType.MEETING_INVITATION_STATUS,
  NotificationType.MEETING_INVITATION_DECLINED,
  NotificationType.MEETING_UPDATED,
  NotificationType.MEETING_CANCELLED,
]);

function dispatchNotificationChanged(notification: AppNotification) {
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_CHANGED_EVENT, {
      detail: {
        id: notification.id,
        category: getNotificationCategory(notification),
      },
    }),
  );
}

function dispatchNotificationCollectionChanged(
  category?: ReturnType<typeof getNotificationCategory>,
) {
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_CHANGED_EVENT, {
      detail: { category },
    }),
  );
}

/**
 * Global hook that owns the notification WebSocket connection lifecycle.
 * Connects the socket when an accessToken is available and dispatches
 * incoming notifications to the Redux store.
 *
 * Mount this once at the WorkspaceShell / WorkspaceHeader level.
 */
export function useNotificationSocket() {
  const { accessToken } = useAppSelector((state: RootState) => state.auth);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) {
      notificationSocketService.disconnect();
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    let isCancelled = false;
    let retryTimer: number | undefined;
    let cleanupSocketListeners: (() => void) | undefined;

    const handleNewNotification = (noti: AppNotification) => {
      dispatch(addNotification(noti));

      if (
        noti.type === NotificationType.SPACE_INVITATION_ACCEPTED ||
        noti.type === NotificationType.SPACE_INVITATION_DECLINED
      ) {
        const spaceId =
          typeof noti.metadata?.spaceId === "string"
            ? noti.metadata.spaceId
            : undefined;
        if (spaceId) {
          queryClient.invalidateQueries({
            queryKey: chatKeys.spaceInvitations(spaceId),
          });
          queryClient.invalidateQueries({
            queryKey: chatKeys.spaceMembers(spaceId),
          });
        }
      }

      if (MEETING_NOTIFICATION_TYPES.has(noti.type)) {
        queryClient.invalidateQueries({
          queryKey: meetingKeys.upcomingRoot,
        });
      }
      dispatchNotificationChanged(noti);
    };

    const handleUpdatedNotification = (notification: AppNotification) => {
      dispatch(updateNotificationSuccess(notification));
      if (MEETING_NOTIFICATION_TYPES.has(notification.type)) {
        queryClient.invalidateQueries({
          queryKey: meetingKeys.upcomingRoot,
        });
      }
      dispatchNotificationChanged(notification);
    };

    const handleDeletedNotification = ({ id }: { id: string }) => {
      dispatch(deleteNotificationSuccess(id));
      dispatchNotificationCollectionChanged();
    };

    const handleDeletedNotifications = (payload: NotificationsDeletedPayload) => {
      dispatch(deleteNotificationsSuccess(payload));
      dispatchNotificationCollectionChanged(payload.category);
    };

    const connectWhenReady = async () => {
      const isReady = await waitForBackendReady(
        BACKEND_HEALTH_PATHS.notification,
        { attempts: 1 },
      );

      if (isCancelled) return;

      if (!isReady) {
        retryTimer = window.setTimeout(connectWhenReady, 3_000);
        return;
      }

      const socket = notificationSocketService.connect(accessToken);
      socket.on("new_notification", handleNewNotification);
      socket.on("notification_updated", handleUpdatedNotification);
      socket.on("notification_deleted", handleDeletedNotification);
      socket.on("notifications_deleted", handleDeletedNotifications);
      cleanupSocketListeners = () => {
        socket.off("new_notification", handleNewNotification);
        socket.off("notification_updated", handleUpdatedNotification);
        socket.off("notification_deleted", handleDeletedNotification);
        socket.off("notifications_deleted", handleDeletedNotifications);
      };
    };

    void connectWhenReady();

    return () => {
      isCancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      cleanupSocketListeners?.();
    };
  }, [accessToken, dispatch, queryClient]);
}
