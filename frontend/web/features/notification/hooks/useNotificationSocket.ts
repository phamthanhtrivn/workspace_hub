import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { notificationSocketService } from "../api/notification-socket.service";
import { addNotification } from "@/store/notification/notification.slice";

/**
 * Global hook that owns the notification WebSocket connection lifecycle.
 * Connects the socket when an accessToken is available and dispatches
 * incoming notifications to the Redux store.
 *
 * Mount this once at the WorkspaceShell / WorkspaceHeader level.
 */
export function useNotificationSocket() {
  const { accessToken } = useAppSelector((state: any) => state.auth);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!accessToken) return;

    notificationSocketService.connect(accessToken);

    const socket = notificationSocketService.getSocket();

    if (!socket) return;

    const handleNewNotification = (noti: any) => {
      dispatch(addNotification(noti));
    };

    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("new_notification", handleNewNotification);
      notificationSocketService.disconnect();
    };
  }, [accessToken, dispatch]);
}
