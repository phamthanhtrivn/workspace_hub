export interface WeatherCoordinates {
  latitude: number;
  longitude: number;
}

export interface DashboardWeather {
  temperatureC: number;
  weatherCode: number;
  isDay: boolean;
  updatedAt: string;
}

export type WeatherSymbol =
  | "clear" | "mostly-clear" | "partly-cloudy" | "cloudy"
  | "fog" | "freezing-fog" | "drizzle" | "freezing-drizzle"
  | "rain" | "freezing-rain" | "rain-showers"
  | "snow" | "snow-grains" | "snow-showers" | "storm" | "hail" | "unknown";

export interface WeatherCondition {
  symbol: WeatherSymbol;
  label: string;
  intensity: 1 | 2 | 3;
}
