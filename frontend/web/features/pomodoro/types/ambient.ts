export type PredefinedAmbientTrackId =
  | "none"
  | "lofi_relax"
  | "gentle_piano"
  | "rain_heavy"
  | "ocean_waves"
  | "coffee_shop"
  | "forest_wind"
  | "alpha_drone_432hz";

export type AmbientTrackId = PredefinedAmbientTrackId | (string & {});

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
export const CUSTOM_AMBIENT_TRACK_ID_PATTERN = /^custom_[A-Za-z0-9_-]+$/;

export function isAmbientTrackId(value: unknown): value is AmbientTrackId {
  return typeof value === "string" && value.length <= MAX_AMBIENT_TRACK_ID_LENGTH &&
    (AMBIENT_TRACKS.some((track) => track.id === value) || CUSTOM_AMBIENT_TRACK_ID_PATTERN.test(value));
}

export interface AmbientTrack {
  id: AmbientTrackId;
  name: string;
  category: "music" | "nature" | "ambient" | "custom";
  icon: string;
  description: string;
  url?: string;
  isProcedural?: boolean;
  isCustom?: boolean;
}

export const AMBIENT_TRACKS: AmbientTrack[] = [
  {
    id: "none",
    name: "Background audio off",
    category: "ambient",
    icon: "VolumeX",
    description: "No audio during focus sessions",
  },
  {
    id: "lofi_relax",
    name: "Lofi Chill & Focus",
    category: "music",
    icon: "Headphones",
    description: "Gentle instrumental lofi music for deep focus",
    url: "/assets/sounds/lofi_relax.wav",
  },
  {
    id: "gentle_piano",
    name: "Gentle Piano",
    category: "music",
    icon: "Music",
    description: "Soft piano music for a calm workspace",
    url: "/assets/sounds/gentle_piano.wav",
  },
  {
    id: "alpha_drone_432hz",
    name: "Alpha Waves 432Hz (Deep Flow)",
    category: "music",
    icon: "Radio",
    description: "432Hz ambient tones for focus and relaxation",
    isProcedural: true,
  },
  {
    id: "rain_heavy",
    name: "Gentle Rain",
    category: "nature",
    icon: "CloudRain",
    description: "Steady rain sounds to soften surrounding noise",
    url: "/assets/sounds/rain_heavy.wav",
  },
  {
    id: "coffee_shop",
    name: "Cozy Cafe",
    category: "ambient",
    icon: "Coffee",
    description: "Warm cafe ambience for your work sessions",
    url: "/assets/sounds/coffee_shop.wav",
  },
  {
    id: "ocean_waves",
    name: "Ocean Waves",
    category: "nature",
    icon: "Waves",
    description: "Relaxing ocean waves to refresh your mind",
    url: "/assets/sounds/ocean_waves.wav",
  },
  {
    id: "forest_wind",
    name: "Forest Breeze",
    category: "nature",
    icon: "Wind",
    description: "A refreshing breeze through the forest",
    url: "/assets/sounds/forest_wind.wav",
  },
];
