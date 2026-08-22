import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RootState, useAppDispatch, useAppSelector } from "@/store/store";
import { notificationSocketService } from "../api/notification-socket.service";
import { addNotification } from "@/store/notification/notification.slice";
import { chatKeys } from "@/features/chat/types/chat.constant";
import {
  NotificationType,
  Notification as AppNotification,
} from "../types/notification.types";

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
    };

    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [accessToken, dispatch, queryClient]);
}
