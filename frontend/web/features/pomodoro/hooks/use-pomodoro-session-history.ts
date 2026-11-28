"use client";

import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { getRecentSessions } from "../api/pomodoro-server.api";
import { localDateKey } from "../utils/pomodoro-report";

export function usePomodoroSessionHistory(enabled: boolean, revision: number) {
  const timeZone = useAccountTimezone();
  const userId = useAppSelector((state) => state.auth.userId);
  return useQuery({
    queryKey: ["pomodoro", "recent-sessions", userId, timeZone, localDateKey(new Date(), timeZone), revision],
    queryFn: () => getRecentSessions(timeZone),
    enabled: enabled && Boolean(userId),
    refetchInterval: 30_000,
  });
}
