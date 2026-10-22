"use client";

import React, { useEffect, useRef } from "react";
import { History, Clock } from "lucide-react";
import { usePomodoroSessionHistory } from "../hooks/use-pomodoro-session-history";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";
import { Button } from "@/components/ui/button";
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
  const history = usePomodoroSessionHistory(records === undefined, lastUpdated);
  const loading = records === undefined && history.isPending;
  const failed = records === undefined && history.isError;
  const visibleSessions = records ?? history.data ?? [];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [page]);

  return (
    <Card className="block text-inherit w-full rounded-panel border border-border bg-card p-5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            <History className="size-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            {title}
          </h3>
        </div>
        {!loading && !failed && <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {totalCount ?? visibleSessions.length} sessions
        </span>}
      </div>

      {loading ? <p role="status" className="text-xs text-muted-foreground">{copy.historyLoading}</p>
        : failed ? <div role="alert" className="text-xs text-destructive-content">
          <p>{copy.historyFailed}</p>
          <Button type="button" variant="link" disabled={history.isFetching} onClick={() => void history.refetch()}>{copy.retry}</Button>
        </div> : visibleSessions.length === 0 ? (
        <div className="py-9 text-center text-xs text-muted-foreground">
          <Clock className="size-7 mx-auto mb-2 text-muted-foreground opacity-60" />
          {records === undefined ? "No sessions recorded today." : "No sessions match the selected date range and filters."}
        </div>
      ) : (
        <div ref={scrollRef} className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {visibleSessions.map((session) => (
            <PomodoroSessionHistoryItem key={session.id} session={session} showDates={showDates} />
          ))}
        </div>
      )}
      {!loading && !failed && totalPages > 1 && onPageChange && (
        <SimplePagination
          page={page} totalPages={totalPages} onPageChange={onPageChange}
          ariaLabel="Session history pagination" className="mt-2"
        />
      )}
    </Card>
  );
});
