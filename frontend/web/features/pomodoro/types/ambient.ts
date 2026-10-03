export type AmbientTrackId = string;
export type AmbientTrackCategory = "music" | "nature" | "ambient";

export interface PomodoroAmbientPreferences {
  trackId: AmbientTrackId;
  volume: number;
  autoPlayOnFocus: boolean;
}

export const DEFAULT_AMBIENT_PREFERENCES: PomodoroAmbientPreferences = {
  trackId: "lofi_relax",
  volume: 0.5,
  autoPlayOnFocus: true,
};

export const MAX_AMBIENT_TRACK_ID_LENGTH = 128;
export const AMBIENT_TRACK_ID_PATTERN = /^(?!custom_)[A-Za-z0-9][A-Za-z0-9_-]*$/;
const LEGACY_CUSTOM_TRACK_ID_PATTERN = /^custom_[A-Za-z0-9_-]+$/;

export function isAmbientTrackId(value: unknown): value is AmbientTrackId {
  return typeof value === "string" && value.length <= MAX_AMBIENT_TRACK_ID_LENGTH &&
    AMBIENT_TRACK_ID_PATTERN.test(value);
}

export function isLegacyCustomTrackId(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_AMBIENT_TRACK_ID_LENGTH &&
    LEGACY_CUSTOM_TRACK_ID_PATTERN.test(value);
}

export function normalizeAmbientPreferences(preferences: PomodoroAmbientPreferences): PomodoroAmbientPreferences {
  return isLegacyCustomTrackId(preferences.trackId) ? { ...preferences, trackId: "none" } : preferences;
}

export interface PomodoroAudio {
  id: AmbientTrackId;
  name: string;
  category: AmbientTrackCategory;
  icon: string;
  description: string;
  s3Key: string;
  sortOrder: number;
  url: string;
}

export function reconcileAmbientPreferences(
  preferences: PomodoroAmbientPreferences,
  audios: readonly PomodoroAudio[] | undefined,
): PomodoroAmbientPreferences {
  const normalized = normalizeAmbientPreferences(preferences);
  if (!audios || normalized.trackId === "none" || audios.some((audio) => audio.id === normalized.trackId)) {
    return normalized;
  }
  return { ...normalized, trackId: "none" };
}

export type AmbientTrack = Pick<PomodoroAudio, "id" | "name" | "category" | "icon" | "description">;

export const AUDIO_OFF_TRACK: AmbientTrack = {
  id: "none",
  name: "Background audio off",
  category: "ambient",
  icon: "VolumeX",
  description: "No audio during focus sessions",
};

export const EMPTY_POMODORO_AUDIOS: PomodoroAudio[] = [];
