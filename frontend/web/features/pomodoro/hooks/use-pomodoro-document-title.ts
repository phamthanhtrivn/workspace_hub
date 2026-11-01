"use client";

import { useEffect } from "react";
import { setPomodoroTitlePrefix } from "@/lib/document-title";
import type { PomodoroCompletionStatus, PomodoroStatus } from "../types/pomodoro";
import { POMODORO_SESSION_COPY } from "../constants/pomodoro-session";

export function usePomodoroDocumentTitle(status: PomodoroStatus, timeLeft: number, completionStatus: PomodoroCompletionStatus = "idle") {
  useEffect(() => {
    if (status === "RUNNING" && timeLeft === 0) {
      setPomodoroTitlePrefix(`${completionStatus === "error" ? POMODORO_SESSION_COPY.waiting : POMODORO_SESSION_COPY.saving} ·`);
      return;
    }
    if (status !== "RUNNING") {
      setPomodoroTitlePrefix(null);
      return;
    }
    const remaining = Math.max(0, timeLeft);
    const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
    const seconds = (remaining % 60).toString().padStart(2, "0");
    setPomodoroTitlePrefix(`(${minutes}:${seconds})`);
  }, [status, timeLeft, completionStatus]);

  useEffect(() => () => {
    setPomodoroTitlePrefix(null);
  }, []);
}
