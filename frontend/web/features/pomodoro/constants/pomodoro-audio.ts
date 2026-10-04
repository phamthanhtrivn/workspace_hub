export const POMODORO_AUDIO_API_PATH = "/api/calendar/pomodoro/audios";
export const POMODORO_AUDIO_STALE_TIME_MS = 60_000;

export const POMODORO_AUDIO_MESSAGES = {
  loading: "Loading audio library...",
  loadError: "Unable to load the audio library.",
  empty: "No audio tracks are available yet.",
  unavailable: "Audio track unavailable. Choose another track.",
  playError: "Unable to play this audio. Try again or choose another track.",
  retry: "Retry",
} as const;
