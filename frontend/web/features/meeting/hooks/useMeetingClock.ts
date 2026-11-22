"use client";

import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";
import { formatInTimezone } from "@/lib/timezone";
import { useEffect, useMemo, useState } from "react";

export function useMeetingClock() {
  const accountTimezone = useAccountTimezone();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timerId);
  }, []);

  return useMemo(
    () => ({
      now,
      timeLabel: formatInTimezone(now, "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }, accountTimezone),
      dateLabel: formatInTimezone(now, "en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }, accountTimezone),
    }),
    [now, accountTimezone],
  );
}
