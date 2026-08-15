"use client";

import { useEffect, useRef } from "react";
import { useAppSelector } from "@/store/store";
import { NotificationType } from "../types/notification.types";
import { useFlashingDocumentTitle } from "../hooks/useFlashingDocumentTitle";
import { playNotificationSound } from "../utils/notification-alert.utils";

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
  const mountedAtRef = useRef(Date.now());
  const titleAlert = useFlashingDocumentTitle("You have new space notifications!");

  useEffect(() => {
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
        new Date(notification.createdAt).getTime() >= mountedAtRef.current,
    );
    knownIdsRef.current = nextIds;

    if (hasNewNotification) {
      playNotificationSound();
      titleAlert.increment();
    }
  }, [notifications, titleAlert]);

  return null;
}
