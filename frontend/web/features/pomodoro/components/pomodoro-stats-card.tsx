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

export const PomodoroStatsOverview = React.memo(function PomodoroStatsOverview({
  lastUpdated,
  dailyGoalPomodoros,
}: PomodoroStatsCardProps) {
  const timeZone = useAccountTimezone();
  const userId = useAppSelector((state) => state.auth.userId);
  const {
    data: stats,
    isError: failed,
    refetch,
  } = useQuery({
    queryKey: [
      "pomodoro",
      "daily-stats",
      userId,
      timeZone,
      localDateKey(new Date(), timeZone),
      lastUpdated,
    ],
    queryFn: () => getDailyStats(timeZone),
    enabled: Boolean(userId),
    refetchInterval: 30_000,
  });
  const goal = dailyGoalPomodoros ?? stats?.dailyGoalPomodoros ?? 0;
  const goalPercent =
    stats && goal > 0
      ? Math.min(100, Math.round((stats.completedPomodoros / goal) * 100))
      : 0;
  const hours = stats ? Math.floor(stats.totalFocusMinutes / 60) : 0;
  const focusTime = stats
    ? hours > 0
      ? `${hours}h ${stats.totalFocusMinutes % 60}m`
      : `${stats.totalFocusMinutes}m`
    : "";
  const metrics = stats
    ? [
        {
          label: "Focus time",
          value: focusTime,
          unit: "Recorded today",
          icon: Timer,
        },
        {
          label: "Completed",
          value: String(stats.completedPomodoros),
          unit: "Focus sessions",
          icon: CheckCircle2,
        },
        {
          label: "Daily goal",
          value: `${stats.completedPomodoros} / ${goal}`,
          unit: "Focus sessions",
          icon: Target,
        },
        {
          label: "Streak",
          value: String(stats.currentStreak),
          unit: stats.currentStreak === 1 ? "Day" : "Days",
          icon: Flame,
        },
      ]
    : [];

  return (
    <section
      aria-label="Today's performance"
      className="@container/performance w-full min-w-0 overflow-hidden rounded-panel border border-border bg-card"
    >
      <PomodoroPanelHeader
        title="Today's focus log"
        description="Your focus activity today."
        icon={Timer}
        action={
          <span className="shrink-0 rounded-control bg-muted px-2 py-1 text-xs font-medium text-muted-foreground tabular-nums">
            {focusTime || "0m"}
          </span>
        }
      />
      {failed && (
        <div
          role="alert"
          className="px-5 py-4 text-xs text-destructive-content"
        >
          Unable to load today&apos;s stats.{" "}
          <Button
            variant="link"
            size="sm"
            type="button"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      )}
      {!stats && !failed && (
        <LoadingState
          label="Loading today's performance..."
          className="px-5 py-6 text-xs text-muted-foreground"
        />
      )}
      {stats && (
        <>
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <div className="rounded-control border border-border bg-muted/40 p-3">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">
                  Daily Focus Target
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {stats.completedPomodoros} / {goal} sessions ({goalPercent}%)
                </span>
              </div>
              <Progress
                value={goalPercent}
                aria-label="Daily focus goal"
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${goalPercent}%` }}
                />
              </Progress>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 px-4 py-4 @min-[520px]/performance:grid-cols-4 sm:px-5">
            {metrics.map(({ label, value, unit, icon: Icon }) => (
              <div
                key={label}
                className="min-w-0 rounded-control border border-border bg-card p-3"
              >
                <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <Icon
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-link"
                  />
                  {label}
                </dt>
                <dd className="mt-1.5 break-words text-xl font-semibold leading-tight tracking-tight text-foreground tabular-nums">
                  {value}
                </dd>
                <dd className="mt-0.5 text-[11px] text-muted-foreground">
                  {unit}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
});
