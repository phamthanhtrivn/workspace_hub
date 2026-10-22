export type PomodoroNotificationPermission = NotificationPermission | "unsupported";

export function getPomodoroNotificationPermission(): PomodoroNotificationPermission {
  return typeof window !== "undefined" && "Notification" in window
    ? window.Notification.permission : "unsupported";
}

export function sendPomodoroNotification(title: string, body: string): boolean {
  if (getPomodoroNotificationPermission() !== "granted") return false;
  try {
    new window.Notification(title, { body, icon: "/favicon.ico" });
    return true;
  } catch {
    return false;
  }
}
