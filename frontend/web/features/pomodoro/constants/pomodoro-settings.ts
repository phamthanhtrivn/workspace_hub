export const POMODORO_CONFIG_RETRY_INTERVAL_MS = 5_000;
export const POMODORO_CONFIG_STALE_TIME_MS = 5 * 60_000;

export const POMODORO_NUMBER_FIELDS = [
  { name: "focusDuration", label: "Focus (minutes)", min: 1, max: 240 },
  { name: "shortBreak", label: "Short break (minutes)", min: 1, max: 120 },
  { name: "longBreak", label: "Long break (minutes)", min: 1, max: 240 },
  { name: "longBreakInterval", label: "Long break interval", min: 2, max: 20,
    description: "Take a long break after this many focus sessions." },
  { name: "dailyGoalPomodoros", label: "Daily goal", min: 1, max: 100,
    description: "Focus sessions per day." },
] as const;

export const POMODORO_SOUND_OPTIONS = [
  { value: "chime", label: "Zen Chime" },
  { value: "bell", label: "Tibetan Bell" },
  { value: "digital", label: "Digital Beep" },
] as const;

export const POMODORO_SETTINGS_MESSAGES = {
  saved: "Pomodoro settings saved",
  pending: "Settings are saved locally and waiting to sync. Automatic retry is enabled.",
  loading: "Loading Pomodoro settings...",
  local: "Using local settings. Account settings will reload when the connection returns.",
};
