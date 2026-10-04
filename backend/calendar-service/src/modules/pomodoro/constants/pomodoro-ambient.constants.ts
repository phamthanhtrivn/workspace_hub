export const AMBIENT_PREFERENCES_ROUTE = 'ambient-preferences';
export const MAX_AMBIENT_TRACK_ID_LENGTH = 128;
export const AMBIENT_TRACK_ID_PATTERN = /^(?!custom_)[A-Za-z0-9][A-Za-z0-9_-]*$/;

export const DEFAULT_AMBIENT_PREFERENCES = {
  trackId: 'lofi_relax',
  volume: 0.5,
  autoPlayOnFocus: true,
};

export const AMBIENT_PREFERENCES_SELECT = {
  ambientTrackId: true,
  ambientVolume: true,
  ambientAutoPlayOnFocus: true,
} as const;

export const AMBIENT_PREFERENCES_MESSAGES = {
  retrieved: 'Pomodoro audio preferences retrieved',
  saved: 'Pomodoro audio preferences saved',
};
