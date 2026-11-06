"use client";

import { useCallback, useState } from "react";
import { getTodayDateValue } from "@/lib/date-range";

export function useScheduleToday(timeZone?: string) {
  const [today, setToday] = useState(() => getTodayDateValue(new Date(), timeZone));
  const refreshToday = useCallback(() => {
    const current = getTodayDateValue(new Date(), timeZone);
    setToday(current);
    return current;
  }, [timeZone]);
  return { today, refreshToday };
}
