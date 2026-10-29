"use client";

import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";
import { useEffect, useReducer } from "react";
import { localDateKey, reportRangeErrors, sameReportRange, type PomodoroReportPreset, type PomodoroReportRange } from "../utils/pomodoro-report";
import { initialReportRange, reportRangeReducer } from "../utils/pomodoro-report-range";

export function usePomodoroReportRange() {
  const timeZone = useAccountTimezone();
  const [state, dispatch] = useReducer(reportRangeReducer, undefined, () => initialReportRange(localDateKey(new Date(), timeZone)));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refreshDay = () => {
      const now = new Date();
      dispatch({ type: "day", today: localDateKey(now, timeZone) });
      clearTimeout(timer);
      timer = setTimeout(refreshDay, 30_000);
    };
    const onVisible = () => { if (document.visibilityState === "visible") refreshDay(); };
    // Reconcile after mounting as well as after sleep/background timer throttling.
    timer = setTimeout(refreshDay, 0);
    window.addEventListener("focus", refreshDay);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refreshDay);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [timeZone]);

  const errors = reportRangeErrors(state.draft, new Date(`${state.today}T00:00:00`));
  return {
    ...state, errors, timeZone,
    dirty: !sameReportRange(state.draft, state.applied),
    setDraft: (range: PomodoroReportRange) => dispatch({ type: "draft", range }),
    apply: () => dispatch({ type: "apply", today: localDateKey(new Date(), timeZone) }),
    cancel: () => dispatch({ type: "cancel" }),
    choosePreset: (preset: PomodoroReportPreset) => dispatch({ type: "preset", preset, today: localDateKey(new Date(), timeZone) }),
  };
}
