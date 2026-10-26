"use client";

import { useEffect, useReducer } from "react";
import { localDateKey, reportRangeErrors, sameReportRange, type PomodoroReportPreset, type PomodoroReportRange } from "../utils/pomodoro-report";
import { initialReportRange, reportRangeReducer } from "../utils/pomodoro-report-range";

export function usePomodoroReportRange() {
  const [state, dispatch] = useReducer(reportRangeReducer, undefined, () => initialReportRange(localDateKey(new Date())));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refreshDay = () => {
      const now = new Date();
      dispatch({ type: "day", today: localDateKey(now) });
      clearTimeout(timer);
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refreshDay, midnight.getTime() - now.getTime());
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
  }, []);

  const errors = reportRangeErrors(state.draft, new Date(`${state.today}T00:00:00`));
  return {
    ...state, errors,
    dirty: !sameReportRange(state.draft, state.applied),
    setDraft: (range: PomodoroReportRange) => dispatch({ type: "draft", range }),
    apply: () => dispatch({ type: "apply", today: localDateKey(new Date()) }),
    cancel: () => dispatch({ type: "cancel" }),
    choosePreset: (preset: PomodoroReportPreset) => dispatch({ type: "preset", preset, today: localDateKey(new Date()) }),
  };
}
