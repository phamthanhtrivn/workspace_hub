import type { WeatherCoordinates } from "../types/dashboard-weather.types";

export const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";
export const WEATHER_CREDIT_URL = "https://open-meteo.com/";
export const WEATHER_REFRESH_MS = 15 * 60_000;
export const WEATHER_MAX_AGE_MS = 60 * 60_000;
export const WEATHER_TIMEOUT_MS = 10_000;
export const WEATHER_LOCATION_MAX_AGE_MS = 5 * 60_000;
export const WEATHER_LOCATION_PREFERENCE_KEY = "workspace-hub:dashboard:weather-location";
export const WEATHER_LOCATION_PREFERENCE_EVENT = "workspace-hub:weather-location-changed";
export const WEATHER_QUERY_ROOT = ["dashboard-weather"] as const;

export const weatherQueryKey = (coordinates: WeatherCoordinates | null) =>
  [...WEATHER_QUERY_ROOT, coordinates?.latitude ?? null, coordinates?.longitude ?? null] as const;
