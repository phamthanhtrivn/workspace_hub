"use client";

import { useEffect, useState } from "react";
import { CLOCK_REFRESH_MS } from "@/lib/timezone";

export function useCurrentTime(intervalMs = CLOCK_REFRESH_MS) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = window.setInterval(refresh, intervalMs);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [intervalMs]);
  return now;
}
