import { z } from "zod";
import { WEATHER_API_URL, WEATHER_TIMEOUT_MS } from "../constants/dashboard-weather";
import type { DashboardWeather, WeatherCoordinates } from "../types/dashboard-weather.types";

const coordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});
const responseSchema = z.object({
  current: z.object({
    temperature_2m: z.number().finite(),
    weather_code: z.number().int(),
    is_day: z.union([z.literal(0), z.literal(1)]),
    time: z.number().finite().positive().max(8_640_000_000_000),
  }),
});

export async function getDashboardWeather(coordinates: WeatherCoordinates, signal: AbortSignal): Promise<DashboardWeather> {
  const position = coordinatesSchema.parse(coordinates);
  const url = new URL(WEATHER_API_URL);
  url.search = new URLSearchParams({
    latitude: String(position.latitude), longitude: String(position.longitude),
    current: "temperature_2m,weather_code,is_day", temperature_unit: "celsius", timeformat: "unixtime",
  }).toString();
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal.aborted) cancel();
  signal.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, WEATHER_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer",
    });
    if (!response.ok) throw new Error("Could not load local weather.");
    const { current } = responseSchema.parse(await response.json());
    return { temperatureC: current.temperature_2m, weatherCode: current.weather_code,
      isDay: current.is_day === 1, updatedAt: new Date(current.time * 1000).toISOString() };
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
  }
}
