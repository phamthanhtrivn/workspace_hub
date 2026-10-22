"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getPageTitle, SITE_NAME } from "@/lib/page-metadata";
import type { PomodoroMode, PomodoroStatus } from "../types/pomodoro";

const MODE_TITLES: Record<PomodoroMode, string> = {
  FOCUS: "🎯 Focus", SHORT_BREAK: "☕ Short Break", LONG_BREAK: "🌴 Long Break",
};

export function usePomodoroDocumentTitle(status: PomodoroStatus, mode: PomodoroMode, timeLeft: number) {
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "RUNNING") {
      document.title = getPageTitle(pathname);
      return;
    }
    const remaining = Math.max(0, timeLeft);
    const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
    const seconds = (remaining % 60).toString().padStart(2, "0");
    document.title = `(${minutes}:${seconds}) ${MODE_TITLES[mode]} - ${SITE_NAME}`;
  }, [pathname, status, mode, timeLeft]);

  useEffect(() => () => {
    // The provider can unmount after navigation; restore the destination, not its opener.
    document.title = getPageTitle(window.location.pathname);
  }, []);
}
