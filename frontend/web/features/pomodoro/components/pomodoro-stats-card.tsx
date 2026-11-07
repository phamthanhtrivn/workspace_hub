"use client";

import React from "react";
import { CheckCircle2, Flame, Target, Timer } from "lucide-react";
import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { getDailyStats } from "../api/pomodoro-server.api";
import { localDateKey } from "../utils/pomodoro-report";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-state";
import { PomodoroPanelHeader } from "./pomodoro-panel-header";

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
  const goal = dailyGoalPomodoros ?? stats?.dailyGoalPomodoros ?? 0;
  const goalPercent = stats && goal > 0 ? Math.min(100, Math.round(stats.completedPomodoros / goal * 100)) : 0;
  const hours = stats ? Math.floor(stats.totalFocusMinutes / 60) : 0;
  const focusTime = stats ? hours > 0 ? `${hours}h ${stats.totalFocusMinutes % 60}m` : `${stats.totalFocusMinutes}m` : "";
  const metrics = stats ? [
    { label: "Focus time", value: focusTime, unit: "Recorded today", icon: Timer },
    { label: "Completed", value: String(stats.completedPomodoros), unit: "Focus sessions", icon: CheckCircle2 },
    { label: "Daily goal", value: `${stats.completedPomodoros} / ${goal}`, unit: "Focus sessions", icon: Target },
    { label: "Streak", value: String(stats.currentStreak), unit: stats.currentStreak === 1 ? "Day" : "Days", icon: Flame },
  ] : [];

  return <section aria-label="Today's performance" className="@container/performance w-full min-w-0 overflow-hidden rounded-panel border border-border bg-card">
    <PomodoroPanelHeader title="Today's performance" description="Your focus activity today." icon={Timer}
      action={<span className="shrink-0 rounded-control bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">Today</span>} />
    {failed && <div role="alert" className="px-5 py-4 text-xs text-destructive-content">Unable to load today&apos;s stats. <Button variant="link" size="sm" type="button" onClick={() => void refetch()}>Retry</Button></div>}
    {!stats && !failed && <LoadingState label="Loading today's performance..." className="px-5 py-6 text-xs text-muted-foreground" />}
    {stats && <>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-6 px-4 py-5 @min-[640px]/performance:grid-cols-4 sm:px-5">
        {metrics.map(({ label, value, unit, icon: Icon }) => <div key={label} className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon aria-hidden="true" className="size-3.5 shrink-0" />{label}</dt>
          <dd className="mt-2 break-words text-2xl font-semibold leading-tight tracking-tight text-foreground tabular-nums">{value}</dd>
          <dd className="mt-1 text-xs text-muted-foreground">{unit}</dd>
        </div>)}
      </dl>
      <div className="border-t border-border px-4 py-4 sm:px-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>Daily focus goal</span><span className="font-medium text-foreground tabular-nums">{goalPercent}%</span></div>
        <Progress value={goalPercent} aria-label="Daily focus goal" className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-link transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${goalPercent}%` }} /></Progress>
      </div>
    </>}
  </section>;
});
