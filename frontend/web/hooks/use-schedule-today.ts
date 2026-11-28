"use client";

import { useCallback } from "react";
import { getTodayDateValue } from "@/lib/date-range";
import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";
import { useCurrentTime } from "./use-current-time";

export function useScheduleToday(timeZone?: string) {
  const accountTimezone = useAccountTimezone();
  const zone = timeZone ?? accountTimezone;
  const now = useCurrentTime(30_000);
  const today = getTodayDateValue(now ?? new Date(), zone);
  const refreshToday = useCallback(() => {
    return getTodayDateValue(new Date(), zone);
  }, [zone]);
  return { today, refreshToday };
}
