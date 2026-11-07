"use client";

import React, { useEffect, useRef, useState } from "react";
import { History, Clock } from "lucide-react";
import { usePomodoroSessionHistory } from "../hooks/use-pomodoro-session-history";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";
import { POMODORO_REPORT_COPY as reportCopy } from "../constants/pomodoro-report";
import { Button } from "@/components/ui/button";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SimplePagination } from "@/components/ui/custom/simple-pagination";
import { PomodoroSessionHistoryItem } from "./pomodoro-session-history-item";
import { PomodoroSessionDetailsDialog } from "./pomodoro-session-details-dialog";

interface PomodoroSessionHistoryProps {
  embedded?: boolean;
  reportView?: boolean;
  timeZone?: string;
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
  embedded = false,
  reportView = false,
  timeZone,
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
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSession = visibleSessions.find(session => session.id === selectedSessionId) ?? null;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [page]);

  return (
    <Card className={cn("block w-full text-inherit", embedded ? "rounded-none border-0 bg-transparent p-0 shadow-none" : "rounded-panel border border-border bg-card p-5")}>
      {reportView ? <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{reportCopy.sessionCount(totalCount ?? visibleSessions.length)}</span><span>{reportCopy.newestFirst}</span>
      </div> : <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
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
      </div>}

      {loading ? <p role="status" className="text-xs text-muted-foreground">{copy.historyLoading}</p>
        : failed ? <div role="alert" className="text-xs text-destructive-content">
          <p>{copy.historyFailed}</p>
          <Button type="button" variant="link" disabled={history.isFetching} onClick={() => void history.refetch()}>{copy.retry}</Button>
        </div> : visibleSessions.length === 0 ? (
        <div className="py-9 text-center text-xs text-muted-foreground">
          <Clock className="size-7 mx-auto mb-2 text-muted-foreground opacity-60" />
          {records === undefined ? "No sessions recorded today." : reportCopy.noSessions}
        </div>
      ) : (
        <div ref={scrollRef} className={cn("overflow-y-auto pr-1 gap-2 flex flex-col", reportView ? "max-h-[min(28rem,60dvh)]" : "max-h-64 space-y-2")}>
          {visibleSessions.map((session) => (
            <PomodoroSessionHistoryItem key={session.id} session={session} showDates={showDates} reportView={reportView} timeZone={timeZone} onViewDetails={() => setSelectedSessionId(session.id)} />
          ))}
        </div>
      )}
      {!loading && !failed && totalPages > 1 && onPageChange && (
        <SimplePagination
          page={page} totalPages={totalPages} onPageChange={onPageChange}
          ariaLabel="Session history pagination" className="mt-2 @max-[400px]/pomodoro:[&>button:first-child]:hidden @max-[400px]/pomodoro:[&>button:last-child]:hidden"
        />
      )}
      <PomodoroSessionDetailsDialog session={selectedSession} timeZone={timeZone} onClose={() => setSelectedSessionId(null)} />
    </Card>
  );
});
