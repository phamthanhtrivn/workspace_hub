"use client";

import { useEffect, useState } from "react";
import { getPomodoroNotificationPermission, sendPomodoroNotification, type PomodoroNotificationPermission } from "../utils/pomodoro-notifications";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";

export function usePomodoroNotifications() {
  const [permission, setPermission] = useState<PomodoroNotificationPermission>("unsupported");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => setPermission(getPomodoroNotificationPermission());
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const requestPermission = async () => {
    if (pending || getPomodoroNotificationPermission() !== "default") return;
    setPending(true);
    setError("");
    try { setPermission(await window.Notification.requestPermission()); }
    catch { setError(copy.notifications.failed); }
    finally { setPending(false); }
  };
  const testNotification = () => {
    setPermission(getPomodoroNotificationPermission());
    setError(sendPomodoroNotification(copy.notifications.testTitle, copy.notifications.testBody)
      ? "" : copy.notifications.failed);
  };
  return { permission, pending, error, requestPermission, testNotification };
}
