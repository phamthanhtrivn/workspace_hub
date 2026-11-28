"use client";

import { useState } from "react";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { reconcileReportFilters, reportFilterOptions, type PomodoroReportFilters } from "../utils/pomodoro-report";
import { POMODORO_REPORT_DEFAULT_FILTERS } from "../constants/pomodoro-report";

// Retain options and selections during loading/errors. Only fresh successful data
// can invalidate a selection; drafts never participate in this reconciliation.
export function usePomodoroReportFilters(sessions: PomodoroSessionRecord[] | undefined, settled: boolean) {
  const [state, setState] = useState<{ sessions: PomodoroSessionRecord[]; filters: PomodoroReportFilters; notice: string }>(
    { sessions: [], filters: POMODORO_REPORT_DEFAULT_FILTERS, notice: "" },
  );
  if (settled && sessions && sessions !== state.sessions) {
    const result = reconcileReportFilters(sessions, state.filters);
    setState({ sessions, filters: result.filters, notice: result.notice || state.notice });
  }
  return {
    filters: state.filters,
    notice: state.notice,
    options: reportFilterOptions(state.sessions, state.filters),
    changeFilters: (filters: PomodoroReportFilters) => setState({ ...state, filters, notice: "" }),
    clearNotice: () => setState({ ...state, notice: "" }),
  };
}
