"use client";

import { useEffect, useRef } from "react";
import { useAppSelector } from "@/store/store";
import { NotificationType } from "../types/notification.types";
import { useFlashingDocumentTitle } from "../hooks/useFlashingDocumentTitle";
import { playNotificationSound } from "../utils/notification-alert.utils";
import { useNotificationAlertPreference } from "@/features/user-setting/hooks/useNotificationAlertPreference";

const SPACE_NOTIFICATION_TYPES = new Set<string>([
  NotificationType.SPACE_INVITATION,
  NotificationType.SPACE_INVITATION_ACCEPTED,
  NotificationType.SPACE_INVITATION_DECLINED,
  NotificationType.SPACE_DISBANDED,
  NotificationType.SPACE_MEMBER_REMOVED,
  NotificationType.CHANNEL_DISBANDED,
]);

export default function SpaceNotificationAlertManager() {
  const notifications = useAppSelector((state) => state.notification.list);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const hasHydratedRef = useRef(false);
  const mountedAtRef = useRef<number | null>(null);
  const titleAlert = useFlashingDocumentTitle("You have new space notifications!");
  const shouldRunNotificationAlert = useNotificationAlertPreference();

  useEffect(() => {
    mountedAtRef.current ??= Date.now();

    const nextIds = new Set(
      notifications.map((notification) => notification.id),
    );

    if (!hasHydratedRef.current) {
      knownIdsRef.current = nextIds;
      hasHydratedRef.current = true;
      return;
    }

    const hasNewNotification = notifications.some(
      (notification) =>
        !knownIdsRef.current.has(notification.id) &&
        SPACE_NOTIFICATION_TYPES.has(notification.type) &&
        new Date(notification.createdAt).getTime() >=
          (mountedAtRef.current ?? 0),
    );
    knownIdsRef.current = nextIds;

    if (shouldRunNotificationAlert && hasNewNotification) {
      playNotificationSound();
      titleAlert.increment();
    }
  }, [notifications, shouldRunNotificationAlert, titleAlert]);

  return null;
}
