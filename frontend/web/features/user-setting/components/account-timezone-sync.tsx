"use client";

import { useEffect, useLayoutEffect } from "react";
import { setDisplayTimezone } from "@/lib/timezone";
import { useUserSettingsQuery } from "../hooks/useUserSettingQueries";

export function AccountTimezoneSync() {
  const settings = useUserSettingsQuery();
  const preference = settings.data?.success
    ? settings.data.data.timezone
    : undefined;
  useLayoutEffect(() => {
    setDisplayTimezone(preference);
    return () => setDisplayTimezone();
  }, [preference]);
  useEffect(() => {
    const refresh = () => setDisplayTimezone(preference);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [preference]);
  return null;
}
