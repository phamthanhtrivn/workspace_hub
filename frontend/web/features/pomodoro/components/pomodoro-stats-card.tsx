"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { getDailyStats } from "../api/pomodoro-server.api";
import type { PomodoroDailyStats } from "../types/pomodoro";

interface PomodoroStatsCardProps {
  lastUpdated: number;
  dailyGoalPomodoros?: number;
}

export const PomodoroStatsOverview = React.memo(function PomodoroStatsOverview({ lastUpdated, dailyGoalPomodoros }: PomodoroStatsCardProps) {
  const [stats, setStats] = useState<PomodoroDailyStats | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryRevision, setRetryRevision] = useState(0);

  useEffect(() => {
    let active = true;
    getDailyStats()
      .then((data) => { if (active) { setStats(data); setFailed(false); } })
      .catch(() => { if (active) { setStats(null); setFailed(true); } });
    return () => { active = false; };
  }, [lastUpdated, retryRevision]);

  if (failed) return <p role="alert" className="text-xs text-destructive">
    Unable to load today&apos;s stats. <Button variant="ghost" type="button" className="underline" onClick={() => setRetryRevision((value) => value + 1)}>Retry</Button>
  </p>;
  if (!stats) return <p role="status" className="text-xs text-muted-foreground">Loading stats...</p>;

  const hours = Math.floor(stats.totalFocusMinutes / 60);
  const mins = stats.totalFocusMinutes % 60;
  const timeDisplay =
    hours > 0 ? `${hours}h ${mins}m` : `${stats.totalFocusMinutes}m`;

  const goalPercent = Math.min(
    100,
    Math.round((stats.completedPomodoros / ((dailyGoalPomodoros ?? stats.dailyGoalPomodoros) || 8)) * 100),
  );

  return (
    <section className="w-full min-w-0 border-t border-border pt-5">
      <h3 className="text-base font-semibold text-foreground">Today&apos;s performance</h3>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
        <div><dt className="text-xs text-muted-foreground">Focus time</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{timeDisplay}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Completed</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{stats.completedPomodoros} <span className="text-xs font-normal text-muted-foreground">sessions</span></dd></div>
        <div><dt className="text-xs text-muted-foreground">Daily goal</dt><dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">{stats.completedPomodoros} / {dailyGoalPomodoros ?? stats.dailyGoalPomodoros} sessions</dd>
          <div role="progressbar" aria-label="Daily focus goal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={goalPercent} className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width] duration-200 motion-reduce:transition-none" style={{ width: goalPercent + "%" }} /></div>
        </div>
        <div><dt className="text-xs text-muted-foreground">Streak</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{stats.currentStreak} <span className="text-xs font-normal text-muted-foreground">days</span></dd></div>
      </dl>
    </section>
  );
});
