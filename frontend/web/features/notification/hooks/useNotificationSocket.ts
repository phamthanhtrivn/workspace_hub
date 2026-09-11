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
  updateNotificationSuccess,
} from "@/store/notification/notification.slice";
import { chatKeys } from "@/features/chat/types/chat.constant";
import { meetingKeys } from "@/features/meeting/types/meeting.query-keys";
import {
  NotificationType,
  Notification as AppNotification,
} from "../types/notification.types";

const MEETING_NOTIFICATION_TYPES = new Set<NotificationType>([
  NotificationType.MEETING_INVITATION,
  NotificationType.MEETING_INVITATION_DECLINED,
  NotificationType.MEETING_UPDATED,
  NotificationType.MEETING_CANCELLED,
]);

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
        const spaceId = noti.metadata?.spaceId;
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
    };

    const handleUpdatedNotification = (notification: AppNotification) => {
      dispatch(updateNotificationSuccess(notification));
      if (MEETING_NOTIFICATION_TYPES.has(notification.type)) {
        queryClient.invalidateQueries({
          queryKey: meetingKeys.upcomingRoot,
        });
      }
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
      cleanupSocketListeners = () => {
        socket.off("new_notification", handleNewNotification);
        socket.off("notification_updated", handleUpdatedNotification);
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
