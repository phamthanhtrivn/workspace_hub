"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { getPomodoroReportSessions } from "../api/pomodoro-report.api";
import { reportRangeBounds, type PomodoroReportRange } from "../utils/pomodoro-report";

export function usePomodoroReport(range: PomodoroReportRange, lastUpdated: number) {
  const userId = useAppSelector((state) => state.auth.userId);
  let validationError = "";
  try { reportRangeBounds(range); } catch (error) {
    validationError = error instanceof Error ? error.message : "Khoảng ngày không hợp lệ.";
  }
  const query = useQuery({
    queryKey: ["pomodoro", "report", userId, range.startDate, range.endDate, lastUpdated],
    queryFn: ({ signal }) => getPomodoroReportSessions(range, signal),
    enabled: Boolean(userId) && !validationError,
    staleTime: 30_000,
  });
  return { ...query, validationError };
}
