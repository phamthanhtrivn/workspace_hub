import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RootState, useAppDispatch, useAppSelector } from "@/store/store";
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

    const socket = notificationSocketService.connect(accessToken);

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

    socket.on("new_notification", handleNewNotification);
    const handleUpdatedNotification = (notification: AppNotification) => {
      dispatch(updateNotificationSuccess(notification));
    };
    socket.on("notification_updated", handleUpdatedNotification);

    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("notification_updated", handleUpdatedNotification);
    };
  }, [accessToken, dispatch, queryClient]);
}
