import { WEATHER_LOCATION_PREFERENCE_EVENT, WEATHER_LOCATION_PREFERENCE_KEY } from "../constants/dashboard-weather";

// Remember the choice in this page even when browser storage is unavailable.
let sessionChoice: boolean | undefined;

export function readWeatherLocationEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionChoice !== undefined) return sessionChoice;
  try {
    return window.localStorage.getItem(WEATHER_LOCATION_PREFERENCE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeWeatherLocationEnabled(enabled: boolean): void {
  sessionChoice = enabled;
  try {
    window.localStorage.setItem(WEATHER_LOCATION_PREFERENCE_KEY, String(enabled));
  } catch {
    // The in-memory choice still works; coordinates are never persisted.
  }
  window.dispatchEvent(new Event(WEATHER_LOCATION_PREFERENCE_EVENT));
}

export function subscribeWeatherLocation(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== WEATHER_LOCATION_PREFERENCE_KEY && event.key !== null) return;
    sessionChoice = undefined;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(WEATHER_LOCATION_PREFERENCE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(WEATHER_LOCATION_PREFERENCE_EVENT, onChange);
  };
}
