"use client";

import React, { useEffect, useState } from "react";
import { History, CheckCircle, AlertCircle, FastForward, Clock } from "lucide-react";
import { getRecentSessions } from "../api/pomodoro-server.api";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { Badge } from "@/components/ui/badge";

interface PomodoroSessionHistoryProps {
  lastUpdated: number;
}

export function PomodoroSessionHistory({
  lastUpdated,
}: PomodoroSessionHistoryProps) {
  const [sessions, setSessions] = useState<PomodoroSessionRecord[]>([]);

  useEffect(() => {
    let active = true;
    getRecentSessions()
      .then((items) => { if (active) setSessions(items); })
      .catch(() => { if (active) setSessions([]); });
    return () => { active = false; };
  }, [lastUpdated]);

  const todaySessions = sessions;

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/40 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <History className="size-3.5" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Nhật ký các phiên hôm nay
          </h3>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {todaySessions.length} phiên
        </span>
      </div>

      {todaySessions.length === 0 ? (
        <div className="py-9 text-center text-xs text-slate-400">
          <Clock className="size-7 mx-auto mb-2 text-slate-300 opacity-60" />
          Chưa có phiên nào được ghi nhận hôm nay.
          <br />
          Bắt đầu phiên Focus đầu tiên để xây dựng chuỗi năng suất!
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {todaySessions.map((s) => {
            const startTime = new Date(s.startedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const endTime = s.endedAt
              ? new Date(s.endedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--";

            const statusBadge = {
              COMPLETED: {
                label: "Hoàn thành",
                icon: CheckCircle,
                className: "bg-emerald-50 text-emerald-700 border-emerald-200",
              },
              STOPPED: {
                label: "Dừng sớm",
                icon: AlertCircle,
                className: "bg-amber-50 text-amber-700 border-amber-200",
              },
              SKIPPED: {
                label: "Bỏ qua",
                icon: FastForward,
                className: "bg-slate-50 text-slate-600 border-slate-200",
              },
            }[s.status];

            const StatusIcon = statusBadge.icon;
            const isFocus = s.sessionType === "FOCUS";

            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-slate-100/90 bg-slate-50/50 p-3 text-xs transition-all hover:bg-slate-100/60 hover:border-slate-200"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`size-2.5 rounded-full shrink-0 ${
                      isFocus
                        ? "bg-[var(--color-primary,#1C4D8D)] shadow-xs ring-2 ring-blue-100"
                        : "bg-teal-500 ring-2 ring-teal-100"
                    }`}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-slate-800 truncate">
                        {s.taskTitle || (isFocus ? "Phiên tập trung tự do" : "Nghỉ ngơi giải lao")}
                      </span>
                      {s.projectName && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          • {s.projectName}
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{startTime} - {endTime}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-600">
                        {s.durationMinutes} phút
                      </span>
                    </div>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`flex items-center gap-1 text-[10px] px-2 py-0.5 font-semibold shrink-0 ${statusBadge.className}`}
                >
                  <StatusIcon className="size-3" />
                  <span>{statusBadge.label}</span>
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
