"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppDispatch } from "@/store/store";
import { markReadSuccess } from "@/store/notification/notification.slice";
import { markAsRead } from "../api/notification.api";
import { NotificationType, type Notification } from "../types/notification.types";
import { getProjectTaskNotificationLink } from "../utils/project-task-notification.utils";

export function useOpenProjectTaskNotification() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  return (notification: Notification, onClose: () => void): boolean => {
    const link = getProjectTaskNotificationLink(notification);
    if (!link) return false;
    const markRead = async () => {
      try {
        await markAsRead(notification.id);
        dispatch(markReadSuccess(notification.id));
      } catch {
        toast.error("Could not mark this notification as read.", {
          action: { label: "Retry", onClick: () => void markRead() },
        });
      }
    };
    if (!notification.isRead) void markRead();
    onClose();
    if (notification.type === NotificationType.PROJECT_TASK_DELETED) toast.info('This task was deleted. Opening its project.');
    router.push(link, { scroll: false });
    return true;
  };
}
