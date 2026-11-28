"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardWeather } from "../api/dashboard-weather.api";
import { WEATHER_LOCATION_MAX_AGE_MS, WEATHER_QUERY_ROOT, WEATHER_REFRESH_MS, WEATHER_TIMEOUT_MS, weatherQueryKey } from "../constants/dashboard-weather";
import type { WeatherCoordinates } from "../types/dashboard-weather.types";
import { readWeatherLocationEnabled, subscribeWeatherLocation, writeWeatherLocationEnabled } from "../utils/dashboard-weather-preference";

export function useDashboardWeather() {
  const client = useQueryClient();
  const [coordinates, setCoordinates] = useState<WeatherCoordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const generation = useRef(0);

  const cancelLocationRequest = useCallback(() => {
    generation.current++;
    inFlight.current = false;
  }, []);

  const clearLocation = useCallback(() => {
    cancelLocationRequest();
    setCoordinates(null);
    setLocating(false);
    setLocationError(null);
    void client.cancelQueries({ queryKey: WEATHER_QUERY_ROOT });
    client.removeQueries({ queryKey: WEATHER_QUERY_ROOT });
  }, [client, cancelLocationRequest]);

  const subscribe = useCallback((onChange: () => void) => subscribeWeatherLocation(() => {
    if (!readWeatherLocationEnabled()) clearLocation();
    onChange();
  }), [clearLocation]);
  const locationEnabled = useSyncExternalStore(subscribe, readWeatherLocationEnabled, () => false);

  const requestLocation = useCallback(() => {
    if (!mounted.current || inFlight.current || !readWeatherLocationEnabled()) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setLocationError("Location unavailable");
      return;
    }
    const request = ++generation.current;
    const isCurrent = () => mounted.current && readWeatherLocationEnabled() && generation.current === request;
    inFlight.current = true;
    setLocating(true);
    setLocationError(null);
    const fail = (denied: boolean) => {
      if (!isCurrent()) return;
      inFlight.current = false;
      setLocating(false);
      setCoordinates(null);
      setLocationError(denied ? "Location blocked" : "Location unavailable");
    };
    try {
      navigator.geolocation.getCurrentPosition(position => {
        if (!isCurrent()) return;
        inFlight.current = false;
        setLocating(false);
        // Approximate coordinates are enough for weather; do not persist a precise position.
        const next = { latitude: Number(position.coords.latitude.toFixed(2)), longitude: Number(position.coords.longitude.toFixed(2)) };
        void client.invalidateQueries({ queryKey: weatherQueryKey(next), exact: true });
        setCoordinates(next);
      }, error => fail(error.code === error.PERMISSION_DENIED), {
        enableHighAccuracy: false, maximumAge: WEATHER_LOCATION_MAX_AGE_MS, timeout: WEATHER_TIMEOUT_MS,
      });
    } catch {
      fail(false);
    }
  }, [client]);

  const setLocationEnabled = useCallback((enabled: boolean) => {
    // Persist before requesting permission; late callbacks must respect the latest choice.
    writeWeatherLocationEnabled(enabled);
    if (enabled) requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    let permission: PermissionStatus | undefined;
    const handlePermission = () => {
      if (!active || !permission || !readWeatherLocationEnabled()) return;
      if (permission.state === "granted") requestLocation();
      else {
        cancelLocationRequest();
        setLocating(false);
        setCoordinates(null);
        setLocationError(permission.state === "denied" ? "Location blocked" : null);
      }
    };
    // Saved opt-in AND existing browser permission are required for auto-loading.
    if (navigator.permissions?.query) {
      void navigator.permissions.query({ name: "geolocation" }).then(result => {
        if (!active) return;
        permission = result;
        permission.addEventListener("change", handlePermission);
        handlePermission();
      }).catch(() => { /* Browsers without permission inspection keep the explicit location button. */ });
    }
    return () => {
      active = false;
      mounted.current = false;
      cancelLocationRequest();
      permission?.removeEventListener("change", handlePermission);
    };
  }, [requestLocation, cancelLocationRequest]);

  const weather = useQuery({
    queryKey: weatherQueryKey(coordinates),
    queryFn: ({ signal }) => {
      if (!coordinates || !readWeatherLocationEnabled()) throw new Error("Location is required for weather.");
      return getDashboardWeather(coordinates, signal);
    },
    enabled: locationEnabled && coordinates !== null,
    staleTime: WEATHER_REFRESH_MS,
    refetchInterval: WEATHER_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  });

  return { weather, locating, locationError, requestLocation, locationEnabled, setLocationEnabled };
}
