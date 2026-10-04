"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { Clock, CheckCircle2, Flame, TrendingUp } from "lucide-react";
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

  if (failed) return <p role="alert" className="text-xs text-rose-600">
    Unable to load today&apos;s stats. <Button variant="ghost" type="button" className="underline" onClick={() => setRetryRevision((value) => value + 1)}>Retry</Button>
  </p>;
  if (!stats) return <p role="status" className="text-xs text-slate-500">Loading stats...</p>;

  const hours = Math.floor(stats.totalFocusMinutes / 60);
  const mins = stats.totalFocusMinutes % 60;
  const timeDisplay =
    hours > 0 ? `${hours}h ${mins}m` : `${stats.totalFocusMinutes}m`;

  const goalPercent = Math.min(
    100,
    Math.round((stats.completedPomodoros / ((dailyGoalPomodoros ?? stats.dailyGoalPomodoros) || 8)) * 100),
  );

  return (
    <div className="w-full min-w-0 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-200/40 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
            Today&apos;s performance
          </h3>
          <p className="text-xs text-slate-500">
            Your work rhythm and focus stats
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Focus Time */}
        <div className="min-w-0 rounded-xl border border-blue-100/70 bg-gradient-to-br from-blue-50/70 to-indigo-50/30 p-3 transition-all hover:shadow-xs">
          <div className="flex items-center gap-2 text-xs text-blue-700 font-semibold">
            <div className="size-7 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-700">
              <Clock className="size-3.5" />
            </div>
            <span>Focus time</span>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {timeDisplay}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Actual focus time</p>
        </div>

        {/* Completed Pomodoros */}
        <div className="min-w-0 rounded-xl border border-emerald-100/70 bg-gradient-to-br from-emerald-50/70 to-teal-50/30 p-3 transition-all hover:shadow-xs">
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
            <div className="size-7 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="size-3.5" />
            </div>
            <span>Completed</span>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900 font-mono tracking-tight tabular-nums flex flex-wrap items-baseline gap-1">
            <span>{stats.completedPomodoros}</span>
            <span className="text-base font-normal text-slate-500">Pomodoros 🍅</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Fully completed sessions</p>
        </div>

        {/* Goal Progress */}
        <div className="min-w-0 rounded-xl border border-indigo-100/70 bg-gradient-to-br from-indigo-50/70 to-sky-50/30 p-3 transition-all hover:shadow-xs">
          <div className="flex items-center justify-between text-xs text-indigo-700 font-semibold">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-indigo-100/80 flex items-center justify-center text-indigo-700">
                <TrendingUp className="size-3.5" />
              </div>
              <span>Daily goal</span>
            </div>
            <span className="font-bold">{goalPercent}%</span>
          </div>
          <div className="mt-2 text-base font-extrabold text-slate-900 tabular-nums">
            {stats.completedPomodoros} / {dailyGoalPomodoros ?? stats.dailyGoalPomodoros} sessions
          </div>
          <div className="mt-2 w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-700 shadow-xs"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
        </div>

        {/* Streak */}
        <div className="min-w-0 rounded-xl border border-amber-100/70 bg-gradient-to-br from-amber-50/70 to-orange-50/30 p-3 transition-all hover:shadow-xs">
          <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold">
            <div className="size-7 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-700">
              <Flame className="size-3.5" />
            </div>
            <span>Streak</span>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-1.5 tabular-nums">
            <span>{stats.currentStreak} days</span>
            <span className="text-xl">🔥</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Keep your daily habit going</p>
        </div>
      </div>
    </div>
  );
});
