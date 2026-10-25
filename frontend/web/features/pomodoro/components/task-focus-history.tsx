"use client";

import { useState } from "react";
import { CheckCircle2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/store";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";
import { useTaskFocusHistory, type TaskFocusHistoryTarget } from "../hooks/use-task-focus-history";
import { POMODORO_TASK_SETTINGS } from "../constants/pomodoro-task";
import { LoadingState } from "@/components/ui/loading-state";

function FocusHistory({ target }: { target: TaskFocusHistoryTarget }) {
  const [page, setPage] = useState(1);
  const { sessionRevision } = usePomodoroSessionActions();
  const { data: history, isLoading, isError, refetch } = useTaskFocusHistory(target, page, sessionRevision);
  return (
    <section aria-label="Your focus history" className="space-y-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Your focus</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Only your sessions</p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">Last {POMODORO_TASK_SETTINGS.historyDays} days</span>
      </div>
      {isLoading ? <LoadingState label="Loading focus history…" className="text-xs text-muted-foreground" /> : isError ? (
        <p role="alert" className="text-xs text-destructive-content">Unable to load focus history. <Button variant="ghost" onClick={() => void refetch()} className="underline">Retry</Button></p>
      ) : history ? <>
        <dl className="grid grid-cols-2 gap-4 rounded-panel bg-background p-4">
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Timer aria-hidden="true" className="size-3.5 shrink-0 text-info-content" />Focus time</dt>
            <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">{Math.floor(history.summary.focusSeconds / 60)}<span className="ml-1 text-xs font-normal tracking-normal text-muted-foreground">min</span></dd>
          </div>
          <div className="min-w-0 border-l border-border pl-4">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0 text-info-content" />Completed sessions</dt>
            <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">{history.summary.completedFocusSessions}</dd>
          </div>
        </dl>
        {history.sessions.length === 0 ? <div className="py-2 text-center">
          <p className="text-xs font-medium text-muted-foreground">No sessions recorded in this period.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Your focus sessions will appear here once saved.</p>
        </div> : (
          <ul className="divide-y divide-border">
            {history.sessions.map((session) => <li key={session.id} className="flex flex-wrap justify-between gap-1 py-2 text-xs text-muted-foreground">
              <span>{new Date(session.startedAt).toLocaleString()} · {session.sessionType === "FOCUS" ? "Focus" : "Break"}</span>
              <span>{Math.floor(session.actualSeconds / 60)}m {session.actualSeconds % 60}s · {session.status.toLowerCase()}</span>
              {session.notes && <p className="w-full whitespace-pre-wrap break-words text-muted-foreground">{session.notes}</p>}
            </li>)}
          </ul>
        )}
        {history.pagination.totalPages > 1 && <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <span>{page}/{history.pagination.totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= history.pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </div>}
      </> : null}
    </section>
  );
}

export function TaskFocusHistory(props: { target: TaskFocusHistoryTarget }) {
  const userId = useAppSelector((state) => state.auth.userId);
  return userId ? <FocusHistory key={`${userId}:${props.target.taskId ?? props.target.eventId}`} {...props} /> : null;
}
