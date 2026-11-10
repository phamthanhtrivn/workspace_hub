"use client";

import { useEffect, useRef } from "react";
import { listenForNotificationAlerts } from '../utils/notification-alert-events';
import { useFlashingDocumentTitle } from "../hooks/useFlashingDocumentTitle";
import { playNotificationSound } from "../utils/notification-alert.utils";
import { useNotificationAlertPreference } from "@/features/user-setting/hooks/useNotificationAlertPreference";

export default function SpaceNotificationAlertManager() {
  const knownIdsRef = useRef<Set<string>>(new Set());
  const titleAlert = useFlashingDocumentTitle("You have new space notifications!");
  const shouldRunNotificationAlert = useNotificationAlertPreference();

  useEffect(() => {
    return listenForNotificationAlerts(window, knownIdsRef.current, shouldRunNotificationAlert, () => {
      playNotificationSound();
      titleAlert.increment();
    });
  }, [shouldRunNotificationAlert, titleAlert]);

  return null;
}
