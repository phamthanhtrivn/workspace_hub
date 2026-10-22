"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { getRecentSessions } from "../api/pomodoro-server.api";

export function usePomodoroSessionHistory(enabled: boolean, revision: number) {
  const userId = useAppSelector((state) => state.auth.userId);
  return useQuery({
    queryKey: ["pomodoro", "recent-sessions", userId, revision],
    queryFn: getRecentSessions,
    enabled: enabled && Boolean(userId),
  });
}
