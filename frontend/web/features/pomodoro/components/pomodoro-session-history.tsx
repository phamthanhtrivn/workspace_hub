"use client";

import React, { useEffect, useRef, useState } from "react";
import { History, Clock } from "lucide-react";
import { getRecentSessions } from "../api/pomodoro-server.api";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { Card } from "@/components/ui/card";
import { SimplePagination } from "@/components/ui/custom/simple-pagination";
import { PomodoroSessionHistoryItem } from "./pomodoro-session-history-item";

interface PomodoroSessionHistoryProps {
  lastUpdated?: number;
  records?: PomodoroSessionRecord[];
  title?: string;
  showDates?: boolean;
  totalCount?: number;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export const PomodoroSessionHistory = React.memo(function PomodoroSessionHistory({
  lastUpdated = 0,
  records,
  title = "Today's session history",
  showDates = false,
  totalCount,
  page = 1,
  totalPages = 1,
  onPageChange,
}: PomodoroSessionHistoryProps) {
  const [sessions, setSessions] = useState<PomodoroSessionRecord[]>([]);

  useEffect(() => {
    if (records !== undefined) return;
    let active = true;
    getRecentSessions()
      .then((items) => { if (active) setSessions(items); })
      .catch(() => { if (active) setSessions([]); });
    return () => { active = false; };
  }, [lastUpdated, records]);

  const visibleSessions = records ?? sessions;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [page]);

  return (
    <Card className="block text-inherit w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/40 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <History className="size-3.5" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            {title}
          </h3>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {totalCount ?? visibleSessions.length} sessions
        </span>
      </div>

      {visibleSessions.length === 0 ? (
        <div className="py-9 text-center text-xs text-slate-400">
          <Clock className="size-7 mx-auto mb-2 text-slate-300 opacity-60" />
          {records === undefined ? "No sessions recorded today." : "No sessions match the selected date range and filters."}
        </div>
      ) : (
        <div ref={scrollRef} className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {visibleSessions.map((session) => (
            <PomodoroSessionHistoryItem key={session.id} session={session} showDates={showDates} />
          ))}
        </div>
      )}
      {totalPages > 1 && onPageChange && (
        <SimplePagination
          page={page} totalPages={totalPages} onPageChange={onPageChange}
          ariaLabel="Session history pagination" className="mt-2"
        />
      )}
    </Card>
  );
});
