export type PomodoroViewMode = "full" | "focus";
export type AmbientPreferencesSyncStatus = "idle" | "saving" | "error";

export const DEFAULT_POMODORO_VIEW_MODE: PomodoroViewMode = "full";
export const AMBIENT_VOLUME_SAVE_DELAY_MS = 300;
export const AMBIENT_PREFERENCES_RETRY_INTERVAL_MS = 5_000;
