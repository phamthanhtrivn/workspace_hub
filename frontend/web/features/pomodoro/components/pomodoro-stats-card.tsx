"use client";

import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";
import { Button } from "@/components/ui/button";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { getDailyStats } from "../api/pomodoro-server.api";
import { localDateKey } from "../utils/pomodoro-report";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-state";

interface PomodoroStatsCardProps {
  lastUpdated: number;
  dailyGoalPomodoros?: number;
}

export const PomodoroStatsOverview = React.memo(function PomodoroStatsOverview({ lastUpdated, dailyGoalPomodoros }: PomodoroStatsCardProps) {
  const timeZone = useAccountTimezone();
  const userId = useAppSelector(state => state.auth.userId);
  const { data: stats, isError: failed, refetch } = useQuery({
    queryKey: ["pomodoro", "daily-stats", userId, timeZone, localDateKey(new Date(), timeZone), lastUpdated],
    queryFn: () => getDailyStats(timeZone), enabled: Boolean(userId), refetchInterval: 30_000,
  });

  if (failed) return <p role="alert" className="text-xs text-destructive-content">
    Unable to load today&apos;s stats. <Button variant="ghost" type="button" className="underline" onClick={() => void refetch()}>Retry</Button>
  </p>;
  if (!stats) return <LoadingState label="Loading stats..." className="text-xs text-muted-foreground" />;

  const hours = Math.floor(stats.totalFocusMinutes / 60);
  const mins = stats.totalFocusMinutes % 60;
  const timeDisplay =
    hours > 0 ? `${hours}h ${mins}m` : `${stats.totalFocusMinutes}m`;

  const goalPercent = Math.min(
    100,
    Math.round((stats.completedPomodoros / ((dailyGoalPomodoros ?? stats.dailyGoalPomodoros) || 8)) * 100),
  );

  return (
    <section className="w-full min-w-0 rounded-panel border border-border bg-card p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-foreground">Today&apos;s performance</h3>
      <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
        <div><dt className="text-xs text-muted-foreground">Focus time</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{timeDisplay}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Completed</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{stats.completedPomodoros} <span className="text-xs font-normal text-muted-foreground">sessions</span></dd></div>
        <div><dt className="text-xs text-muted-foreground">Daily goal</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{stats.completedPomodoros} / {dailyGoalPomodoros ?? stats.dailyGoalPomodoros} <span className="text-xs font-normal text-muted-foreground">sessions</span></dd>
        </div>
        <div><dt className="text-xs text-muted-foreground">Streak</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{stats.currentStreak} <span className="text-xs font-normal text-muted-foreground">days</span></dd></div>
      </dl>
      <Progress value={goalPercent} aria-label="Daily focus goal" className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-link transition-[width] duration-200 motion-reduce:transition-none" style={{ width: goalPercent + "%" }} /></Progress>
    </section>
  );
});
