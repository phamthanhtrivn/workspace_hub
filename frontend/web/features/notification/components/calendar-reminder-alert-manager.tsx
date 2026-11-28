"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useNotificationAlertPreference } from "@/features/user-setting/hooks/useNotificationAlertPreference";
import { useAppSelector } from "@/store/store";
import { NOTIFICATION_RECEIVED_EVENT } from "../utils/notification-category.utils";
import {
  CALENDAR_REMINDER_ALERT_COPY,
  consumeCalendarPush,
} from "../utils/calendar-reminder-alert";
import { playNotificationSound } from "../utils/notification-alert.utils";
import type { Notification } from "../types/notification.types";

export default function CalendarReminderAlertManager() {
  const router = useRouter();
  const soundEnabled = useNotificationAlertPreference();
  const userId = useAppSelector((state) => state.auth.userId);
  const known = useRef<{ userId: typeof userId; ids: Set<string> }>({
    userId,
    ids: new Set(),
  });
  useEffect(() => {
    if (known.current.userId !== userId)
      known.current = { userId, ids: new Set() };
    const receive = (event: Event) => {
      const notification = (event as CustomEvent<Notification>).detail;
      if (
        !notification ||
        notification.recipientId !== userId ||
        !consumeCalendarPush(
          notification,
          known.current.ids,
          document.visibilityState === "visible",
          document.hasFocus(),
        )
      )
        return;
      const eventId = notification.metadata?.eventId;
      const link =
        typeof eventId === "string"
          ? `/calendar?eventId=${encodeURIComponent(eventId)}`
          : "/calendar";
      toast.info(
        typeof notification.metadata?.eventTitle === "string"
          ? notification.metadata.eventTitle
          : CALENDAR_REMINDER_ALERT_COPY.title,
        {
          id: `calendar-reminder:${notification.id}`,
          description: notification.content,
          action: {
            label: CALENDAR_REMINDER_ALERT_COPY.open,
            onClick: () => router.push(link),
          },
        },
      );
      if (soundEnabled) playNotificationSound();
    };
    window.addEventListener(NOTIFICATION_RECEIVED_EVENT, receive);

    return () =>
      window.removeEventListener(NOTIFICATION_RECEIVED_EVENT, receive);
  }, [router, soundEnabled, userId]);

  return null;
}
