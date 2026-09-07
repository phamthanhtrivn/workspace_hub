"use client";

import { useEffect, useMemo, useState } from "react";

export function useMeetingClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timerId);
  }, []);

  return useMemo(
    () => ({
      timeLabel: now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      dateLabel: now.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    }),
    [now],
  );
}
