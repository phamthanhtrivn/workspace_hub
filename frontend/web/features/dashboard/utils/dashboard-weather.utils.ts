import type { WeatherCondition } from "../types/dashboard-weather.types";

/** WMO codes: https://open-meteo.com/en/docs#weathervariables */
const WEATHER_CONDITIONS: Readonly<Partial<Record<number, WeatherCondition>>> = {
  1: { symbol: "mostly-clear", label: "Mostly clear", intensity: 1 },
  2: { symbol: "partly-cloudy", label: "Partly cloudy", intensity: 1 },
  3: { symbol: "cloudy", label: "Overcast", intensity: 1 },
  45: { symbol: "fog", label: "Fog", intensity: 1 },
  48: { symbol: "freezing-fog", label: "Freezing fog", intensity: 1 },
  51: { symbol: "drizzle", label: "Light drizzle", intensity: 1 },
  53: { symbol: "drizzle", label: "Moderate drizzle", intensity: 2 },
  55: { symbol: "drizzle", label: "Dense drizzle", intensity: 3 },
  56: { symbol: "freezing-drizzle", label: "Light freezing drizzle", intensity: 1 },
  57: { symbol: "freezing-drizzle", label: "Dense freezing drizzle", intensity: 3 },
  61: { symbol: "rain", label: "Light rain", intensity: 1 },
  63: { symbol: "rain", label: "Moderate rain", intensity: 2 },
  65: { symbol: "rain", label: "Heavy rain", intensity: 3 },
  66: { symbol: "freezing-rain", label: "Light freezing rain", intensity: 1 },
  67: { symbol: "freezing-rain", label: "Heavy freezing rain", intensity: 3 },
  71: { symbol: "snow", label: "Light snow", intensity: 1 },
  73: { symbol: "snow", label: "Moderate snow", intensity: 2 },
  75: { symbol: "snow", label: "Heavy snow", intensity: 3 },
  77: { symbol: "snow-grains", label: "Snow grains", intensity: 2 },
  80: { symbol: "rain-showers", label: "Light rain showers", intensity: 1 },
  81: { symbol: "rain-showers", label: "Moderate rain showers", intensity: 2 },
  82: { symbol: "rain-showers", label: "Heavy rain showers", intensity: 3 },
  85: { symbol: "snow-showers", label: "Light snow showers", intensity: 1 },
  86: { symbol: "snow-showers", label: "Heavy snow showers", intensity: 3 },
  95: { symbol: "storm", label: "Thunderstorm", intensity: 2 },
  96: { symbol: "hail", label: "Thunderstorm with light hail", intensity: 1 },
  97: { symbol: "storm", label: "Heavy thunderstorm", intensity: 3 },
  99: { symbol: "hail", label: "Thunderstorm with heavy hail", intensity: 3 },
};

export function describeWeather(code: number, isDay: boolean): WeatherCondition {
  if (code === 0) return { symbol: "clear", label: isDay ? "Clear skies" : "Clear night", intensity: 1 };
  return WEATHER_CONDITIONS[code] ?? { symbol: "unknown", label: "Conditions unavailable", intensity: 1 };
}
