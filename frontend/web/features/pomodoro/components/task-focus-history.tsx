"use client";

import { useState } from "react";
import { CheckCircle2, Timer } from "lucide-react";
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
    <section aria-label="Your focus history" className="space-y-4 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Your focus</h3>
          <p className="mt-0.5 text-xs text-slate-500">Only your sessions</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">Last {POMODORO_TASK_SETTINGS.historyDays} days</span>
      </div>
      {isLoading ? <p role="status" className="text-xs text-slate-500">Loading focus history…</p> : isError ? (
        <p role="alert" className="text-xs text-rose-600">Unable to load focus history. <Button variant="ghost" onClick={() => void refetch()} className="underline">Retry</Button></p>
      ) : history ? <>
        <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-slate-500"><Timer aria-hidden="true" className="size-3.5 shrink-0 text-blue-600" />Focus time</dt>
            <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{Math.floor(history.summary.focusSeconds / 60)}<span className="ml-1 text-xs font-normal tracking-normal text-slate-500">min</span></dd>
          </div>
          <div className="min-w-0 border-l border-slate-200 pl-4">
            <dt className="flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0 text-blue-600" />Completed sessions</dt>
            <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{history.summary.completedFocusSessions}</dd>
          </div>
        </dl>
        {history.sessions.length === 0 ? <div className="py-2 text-center">
          <p className="text-xs font-medium text-slate-600">No sessions recorded in this period.</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Your focus sessions will appear here once saved.</p>
        </div> : (
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
