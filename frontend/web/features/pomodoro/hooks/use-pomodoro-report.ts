"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { getPomodoroReportSessions } from "../api/pomodoro-report.api";
import { reportRangeBounds, type PomodoroReportRange } from "../utils/pomodoro-report";
import { POMODORO_REPORT_COPY as copy, POMODORO_REPORT_STALE_TIME_MS } from "../constants/pomodoro-report";

export function usePomodoroReport(range: PomodoroReportRange, lastUpdated: number, today: string, timeZone: string) {
  const userId = useAppSelector((state) => state.auth.userId);
  let validationError = "";
  try { reportRangeBounds(range, new Date(), timeZone); } catch (error) {
    validationError = error instanceof Error ? error.message : copy.invalidRange;
  }
  const query = useQuery({
    queryKey: ["pomodoro", "report", userId, range.startDate, range.endDate, today, timeZone, lastUpdated],
    queryFn: ({ signal }) => getPomodoroReportSessions(range, signal, timeZone),
    enabled: Boolean(userId) && !validationError,
    staleTime: POMODORO_REPORT_STALE_TIME_MS,
  });
  return { ...query, validationError };
}
