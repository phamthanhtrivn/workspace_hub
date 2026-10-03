"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/store";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";
import { useTaskFocusHistory, type TaskFocusHistoryTarget } from "../hooks/use-task-focus-history";
import { POMODORO_TASK_SETTINGS } from "../constants/pomodoro-task";

function FocusHistory({ target }: { target: TaskFocusHistoryTarget }) {
  const [page, setPage] = useState(1);
  const { sessionRevision } = usePomodoroSessionActions();
  const { data: history, isLoading, isError, refetch } = useTaskFocusHistory(target, page, sessionRevision);
  return (
    <section aria-label="Your focus history" className="space-y-3 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">Your focus</h3>
        <span className="text-xs text-slate-500">Last {POMODORO_TASK_SETTINGS.historyDays} days · Only your sessions</span>
      </div>
      {isLoading ? <p role="status" className="text-xs text-slate-500">Loading focus history…</p> : isError ? (
        <p role="alert" className="text-xs text-rose-600">Unable to load focus history. <button onClick={() => void refetch()} className="underline">Retry</button></p>
      ) : history ? <>
        <p className="text-sm font-medium text-blue-900">{Math.floor(history.summary.focusSeconds / 60)} minutes of focus · {history.summary.completedFocusSessions} completed sessions</p>
        {history.sessions.length === 0 ? <p className="text-xs text-slate-500">No sessions recorded in this period.</p> : (
          <ul className="divide-y divide-slate-100">
            {history.sessions.map((session) => <li key={session.id} className="flex flex-wrap justify-between gap-1 py-2 text-xs text-slate-600">
              <span>{new Date(session.startedAt).toLocaleString()} · {session.sessionType === "FOCUS" ? "Focus" : "Break"}</span>
              <span>{Math.floor(session.actualSeconds / 60)}m {session.actualSeconds % 60}s · {session.status.toLowerCase()}</span>
              {session.notes && <p className="w-full whitespace-pre-wrap break-words text-slate-500">{session.notes}</p>}
            </li>)}
          </ul>
        )}
        {history.pagination.totalPages > 1 && <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
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
