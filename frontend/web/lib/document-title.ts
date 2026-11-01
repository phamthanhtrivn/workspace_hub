import { getPageTitle } from "./page-metadata";

export const DOCUMENT_TITLE_FLASH_INTERVAL_MS = 1_500;
const MIXED_NOTIFICATION_TITLE = "New notifications";
const alerts = new Map<string, { count: number; message: string }>();
const listeners = new Set<() => void>();
let timerPrefix: string | null = null;

export function refreshDocumentTitle(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeDocumentTitle(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setPomodoroTitlePrefix(prefix: string | null): void {
  if (timerPrefix === prefix) return;
  timerPrefix = prefix;
  refreshDocumentTitle();
}

export function incrementDocumentTitleAlert(id: string, message: string): void {
  alerts.set(id, { count: (alerts.get(id)?.count ?? 0) + 1, message });
  refreshDocumentTitle();
}

export function removeDocumentTitleAlert(id: string): void {
  if (alerts.delete(id)) refreshDocumentTitle();
}

export function clearDocumentTitleAlerts(): void {
  if (!alerts.size) return;
  alerts.clear();
  refreshDocumentTitle();
}

export function hasDocumentTitleAlerts(): boolean {
  return alerts.size > 0;
}

export function composeDocumentTitle(pathname: string, showNotification = false): string {
  const pageTitle = getPageTitle(pathname);
  const title = timerPrefix ? `${timerPrefix} ${pageTitle}` : pageTitle;
  if (!showNotification || !alerts.size) return title;
  const notifications = [...alerts.values()];
  const count = notifications.reduce((sum, alert) => sum + alert.count, 0);
  const message = notifications.length === 1 ? notifications[0].message : MIXED_NOTIFICATION_TITLE;
  return `(${count}) ${message} | ${title}`;
}
