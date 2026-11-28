export const POMODORO_SYNC_RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 30_000] as const;

export const POMODORO_SYNC_COPY = {
  saving: "Syncing timer…",
  synced: "Timer synced",
  pending: "Saved locally · Waiting to sync",
  error: "Timer could not sync. Retry or review the last change.",
  retry: "Retry sync",
  settings: "Settings are saved locally. Account sync is pending.",
} as const;
