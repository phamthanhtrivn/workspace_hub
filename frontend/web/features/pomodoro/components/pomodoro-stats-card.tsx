"use client";

import React, { useEffect, useState } from "react";
import { Clock, CheckCircle2, Flame, TrendingUp, Download } from "lucide-react";
import { getDailyStats, getRecentSessions } from "../api/pomodoro-server.api";
import type { PomodoroDailyStats } from "../types/pomodoro";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PomodoroStatsCardProps {
  lastUpdated: number;
}

export const PomodoroStatsOverview = React.memo(function PomodoroStatsOverview({ lastUpdated }: PomodoroStatsCardProps) {
  const [stats, setStats] = useState<PomodoroDailyStats | null>(null);

  useEffect(() => {
    let active = true;
    getDailyStats()
      .then((data) => { if (active) setStats(data); })
      .catch(() => { if (active) setStats(null); });
    return () => { active = false; };
  }, [lastUpdated]);

  const handleExportData = async () => {
    let sessions;
    try {
      sessions = await getRecentSessions();
    } catch {
      toast.error("Không tải được dữ liệu phiên để xuất.");
      return;
    }
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify({ stats, sessions }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `workspace_hub_pomodoro_${new Date().toISOString().split("T")[0]}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!stats) return null;

  const hours = Math.floor(stats.totalFocusMinutes / 60);
  const mins = stats.totalFocusMinutes % 60;
  const timeDisplay =
    hours > 0 ? `${hours}h ${mins}m` : `${stats.totalFocusMinutes}m`;

  const goalPercent = Math.min(
    100,
    Math.round((stats.completedPomodoros / (stats.dailyGoalPomodoros || 8)) * 100),
  );

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/40 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
            Hiệu suất hôm nay
          </h3>
          <p className="text-xs text-slate-500">
            Dữ liệu nhịp độ làm việc và độ tập trung
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportData}
          title="Xuất dữ liệu phục vụ nghiên cứu & báo cáo đồ án"
          className="h-8 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
        >
          <Download className="size-3.5 mr-1.5" /> Xuất dữ liệu
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Total Focus Time */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/30 border border-blue-100/70 p-4 transition-all hover:shadow-xs">
          <div className="flex items-center gap-2 text-xs text-blue-700 font-semibold">
            <div className="size-7 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-700">
              <Clock className="size-3.5" />
            </div>
            <span>Thời gian Focus</span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 font-mono tracking-tight">
            {timeDisplay}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Thời gian tập trung thực tế</p>
        </div>

        {/* Completed Pomodoros */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border border-emerald-100/70 p-4 transition-all hover:shadow-xs">
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
            <div className="size-7 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="size-3.5" />
            </div>
            <span>Đã hoàn thành</span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1">
            <span>{stats.completedPomodoros}</span>
            <span className="text-base font-normal text-slate-500">quả 🍅</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Phiên hoàn thành trọn vẹn</p>
        </div>

        {/* Goal Progress */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50/70 to-sky-50/30 border border-indigo-100/70 p-4 transition-all hover:shadow-xs">
          <div className="flex items-center justify-between text-xs text-indigo-700 font-semibold">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-indigo-100/80 flex items-center justify-center text-indigo-700">
                <TrendingUp className="size-3.5" />
              </div>
              <span>Mục tiêu ngày</span>
            </div>
            <span className="font-bold">{goalPercent}%</span>
          </div>
          <div className="mt-3 text-xl font-extrabold text-slate-900">
            {stats.completedPomodoros} / {stats.dailyGoalPomodoros} phiên
          </div>
          <div className="mt-2 w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-700 shadow-xs"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
        </div>

        {/* Streak */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-50/70 to-orange-50/30 border border-amber-100/70 p-4 transition-all hover:shadow-xs">
          <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold">
            <div className="size-7 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-700">
              <Flame className="size-3.5" />
            </div>
            <span>Chuỗi Streak</span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>{stats.currentStreak} ngày</span>
            <span className="text-xl">🔥</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Duy trì thói quen liên tục</p>
        </div>
      </div>
    </div>
  );
});
