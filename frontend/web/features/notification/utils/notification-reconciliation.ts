export const NOTIFICATION_RECONCILIATION_INTERVAL_MS = 15_000;

interface NotificationReconciliationOptions {
  events: EventTarget;
  visibilityEvents?: EventTarget;
  isVisible: () => boolean;
  refresh: () => Promise<unknown>;
  schedule: (callback: () => void, interval: number) => () => void;
}

export function startNotificationReconciliation({
  events,
  visibilityEvents = events,
  isVisible,
  refresh,
  schedule,
}: NotificationReconciliationOptions) {
  let stopped = false;
  let running = false;
  const refreshNow = async () => {
    if (stopped || running || !isVisible()) return;
    running = true;
    try {
      await refresh();
    } catch {
      /* Retry on focus, reconnection or the next interval. */
    } finally {
      running = false;
    }
  };
  const onRefresh = () => {
    void refreshNow();
  };
  events.addEventListener("focus", onRefresh);
  events.addEventListener("online", onRefresh);
  visibilityEvents.addEventListener("visibilitychange", onRefresh);
  const cancel = schedule(onRefresh, NOTIFICATION_RECONCILIATION_INTERVAL_MS);
  onRefresh();

  return () => {
    stopped = true;
    cancel();
    events.removeEventListener("focus", onRefresh);
    events.removeEventListener("online", onRefresh);
    visibilityEvents.removeEventListener("visibilitychange", onRefresh);
  };
}
