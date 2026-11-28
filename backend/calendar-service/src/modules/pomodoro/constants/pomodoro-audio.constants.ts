export const POMODORO_AUDIO_ROUTE = 'audios';
export const POMODORO_AUDIO_ACCESS_ROUTE = 'audios/:id/access-url';
export const POMODORO_AUDIO_API_PATH = '/api/calendar/pomodoro/audios';
export const POMODORO_AUDIO_S3_PREFIX = 'pomodoro-audio/';
export const POMODORO_AUDIO_URL_TTL_SECONDS = 3600;
export const POMODORO_AUDIO_MESSAGES = {
  retrieved: 'Pomodoro audio library retrieved',
  unavailable: 'Pomodoro audio is unavailable',
  configurationMissing: 'Pomodoro audio storage is not configured',
} as const;
