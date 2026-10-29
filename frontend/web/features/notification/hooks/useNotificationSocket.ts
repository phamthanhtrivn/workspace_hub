import { toast } from "sonner";
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
  setUnreadCount,
  deleteNotificationSuccess,
  deleteNotificationsSuccess,
  updateNotificationSuccess,
} from "@/store/notification/notification.slice";
import { chatKeys } from "@/features/chat/types/chat.constant";
import { meetingKeys } from "@/features/meeting/types/meeting.query-keys";
import {
  getNotificationCategory,
  NOTIFICATION_CHANGED_EVENT,
  NOTIFICATION_READ_COMMITTED_EVENT,
} from "../utils/notification-category.utils";
import {
  NotificationType,
  NOTIFICATION_SOCKET_EVENT,
  Notification as AppNotification,
} from "../types/notification.types";

interface NotificationsDeletedPayload {
  category: ReturnType<typeof getNotificationCategory>;
  deletedCount: number;
  fromDate?: string;
  isRead?: boolean;
  toDate?: string;
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
        noti.type === NotificationType.CHANNEL_MEMBER_ADDED ||
        noti.type === NotificationType.CHANNEL_MEMBER_REMOVED ||
        noti.type === NotificationType.CHANNEL_OWNERSHIP_TRANSFERRED
      ) {
        const spaceId =
          typeof noti.metadata?.spaceId === "string" ? noti.metadata.spaceId : undefined;
        const channelId =
          typeof noti.metadata?.channelId === "string" ? noti.metadata.channelId : undefined;
        queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
        if (spaceId) {
          queryClient.invalidateQueries({
            queryKey: chatKeys.spaceDetails(spaceId),
          });
          queryClient.invalidateQueries({
            queryKey: chatKeys.spaceMemberCandidatesForSpace(spaceId),
          });
        }
        if (channelId) {
          queryClient.invalidateQueries({
            queryKey: chatKeys.channelMembers(channelId).slice(0, 2),
          });
        }
      }

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

      if (noti.type === NotificationType.CALENDAR_REMINDER) {
        if (noti.metadata?.type === "ATTENDEE_REMOVED") {
          const title =
            typeof noti.metadata.eventTitle === "string"
              ? noti.metadata.eventTitle
              : "Calendar Event";
          toast.info(`You were removed from event: "${title}"`);
        }
        queryClient.invalidateQueries({
          queryKey: ["calendar"],
        });
      }
      if (noti.type === NotificationType.CALENDAR_REMINDER) void queryClient.invalidateQueries({ queryKey: ["projects", "dashboard-completed-tasks"] });
      dispatchNotificationChanged(noti);
      void reconcileNotifications();
    };

    const handleUpdatedNotification = (notification: AppNotification) => {
      dispatch(updateNotificationSuccess(notification));
      if (MEETING_NOTIFICATION_TYPES.has(notification.type)) {
        queryClient.invalidateQueries({
          queryKey: meetingKeys.upcomingRoot,
        });
      }
      dispatchNotificationChanged(notification);
      void reconcileNotifications();
    };

    const handleDeletedNotification = ({ id }: { id: string }) => {
      dispatch(deleteNotificationSuccess(id));
      dispatchNotificationCollectionChanged();
      void reconcileNotifications();
    };

    const handleDeletedNotifications = (payload: NotificationsDeletedPayload) => {
      dispatch(deleteNotificationsSuccess(payload));
      dispatchNotificationCollectionChanged(payload.category);
      void reconcileNotifications();
    };

    let reconciliationRevision = 0;
    const reconcileNotifications = async () => {
      const revision = ++reconciliationRevision;
      const { getUnreadCount } = await import('../api/notification.api');
      try {
        const response = await getUnreadCount();
        if (isCancelled || revision !== reconciliationRevision) return;
        dispatch(setUnreadCount(response.data.unreadCount));
        dispatchNotificationCollectionChanged();
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch { /* Reconcile again after the next connection/event. */ }
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
      socket.on("connect", reconcileNotifications);
      socket.on(NOTIFICATION_SOCKET_EVENT.CHANGED, reconcileNotifications);
      void reconcileNotifications();
      socket.on("new_notification", handleNewNotification);
      socket.on("notification_updated", handleUpdatedNotification);
      socket.on("notification_deleted", handleDeletedNotification);
      socket.on("notifications_deleted", handleDeletedNotifications);
      cleanupSocketListeners = () => {
        socket.off("connect", reconcileNotifications);
        socket.off(NOTIFICATION_SOCKET_EVENT.CHANGED, reconcileNotifications);
        socket.off("new_notification", handleNewNotification);
        socket.off("notification_updated", handleUpdatedNotification);
        socket.off("notification_deleted", handleDeletedNotification);
        socket.off("notifications_deleted", handleDeletedNotifications);
      };
    };

    window.addEventListener(NOTIFICATION_READ_COMMITTED_EVENT, reconcileNotifications);
    void connectWhenReady();

    return () => {
      isCancelled = true;
      window.removeEventListener(NOTIFICATION_READ_COMMITTED_EVENT, reconcileNotifications);
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      cleanupSocketListeners?.();
    };
  }, [accessToken, dispatch, queryClient]);
}
