"use client";

import { useId } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { WEATHER_CREDIT_URL, WEATHER_MAX_AGE_MS } from "../../constants/dashboard-weather";
import { useDashboardWeather } from "../../hooks/use-dashboard-weather";
import { describeWeather } from "../../utils/dashboard-weather.utils";
import { DashboardSun } from "./dashboard-sun";
import { DashboardWeatherIcon } from "./dashboard-weather-icon";

export function DashboardWeather({ now, zone }: { now: string | null; zone: string }) {
  const { weather, locating, locationError, requestLocation, locationEnabled, setLocationEnabled } = useDashboardWeather();
  const toggleId = useId();
  const current = locationEnabled ? weather.data : undefined;
  const condition = current ? describeWeather(current.weatherCode, current.isDay) : null;
  const old = current && now ? Date.parse(now) - Date.parse(current.updatedAt) > WEATHER_MAX_AGE_MS : false;
  const pending = locationEnabled && (locating || weather.isFetching);
  const label = locating ? "Finding location…" : weather.isFetching && !current ? "Loading weather…"
    : locationError ?? (weather.isError && !current ? "Weather unavailable" : null);
  const details = current && condition
    ? `${Math.round(current.temperatureC)}°C · ${condition.label}${weather.isError || old ? " · Previous weather, refresh to update" : ""}`
    : !locationEnabled ? "Weather is off. Illustration follows local time." : label ?? "Use location";
  const help = locationError === "Location blocked"
    ? "Allow location in your browser settings, then retry."
    : "Uses your approximate location for weather from Open-Meteo. Location is not saved to your account.";

  return (
    <div className="w-24 shrink-0 text-center sm:w-32">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="unstyled" disabled={!locationEnabled}
            aria-label={`Local weather details. ${details}`} aria-busy={pending}
            className="flex w-full cursor-pointer flex-col items-center rounded-control px-1 py-1 transition-colors enabled:hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default">
            {current && condition ? <DashboardWeatherIcon condition={condition} isDay={current.isDay} />
              : <span aria-hidden><DashboardSun now={now} zone={zone} /></span>}
            {locationEnabled ? <span role="status" className="text-xs font-medium leading-5 text-foreground">{current ? `${Math.round(current.temperatureC)}°C` : details}</span> : null}
            {current && condition ? <span className="text-xs leading-4 text-muted-foreground">{condition.label}</span> : null}
            {current && (old || weather.isError) ? <span className="text-xs leading-4 text-muted-foreground">Previous weather</span> : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-w-[calc(100vw-2rem)] space-y-3 p-4 text-left" aria-label="Local weather details">
          <h2 className="text-sm font-semibold">Local weather</h2>
          <p className="text-sm">{details}</p>
          <p className="text-xs leading-5 text-muted-foreground">{help}</p>
          <Button loading={pending} type="button" variant="outline" size="sm" disabled={pending} onClick={requestLocation}>
            <RefreshCw aria-hidden className="size-4" />
            {pending ? "Updating…" : current ? "Refresh" : "Try location"}
          </Button>
          {current ? <p className="border-t border-border pt-2 text-xs text-muted-foreground">
            Weather data by <a href={WEATHER_CREDIT_URL} target="_blank" rel="noopener noreferrer"
              aria-label="Open-Meteo weather data, licensed under CC BY 4.0"
              className="inline-flex min-h-6 cursor-pointer items-center rounded-control text-link underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:min-h-11">Open-Meteo</a> (CC BY 4.0).
          </p> : null}
        </PopoverContent>
      </Popover>
      <label htmlFor={toggleId} className="mt-1 flex cursor-pointer items-center justify-center gap-2 text-left text-xs leading-4 text-muted-foreground">
        <span>Use location</span>
        <Switch id={toggleId} aria-label="Use location for weather" checked={locationEnabled} onCheckedChange={setLocationEnabled} />
      </label>
    </div>
  );
}
