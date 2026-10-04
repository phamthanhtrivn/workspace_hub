"use client";

import { CheckCircle, AlertCircle, FastForward, StickyNote, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { POMODORO_DISPLAY_LOCALE } from "../constants/pomodoro-display";

interface PomodoroSessionHistoryItemProps {
  session: PomodoroSessionRecord;
  showDates?: boolean;
}

export function PomodoroSessionHistoryItem({ session, showDates = false }: PomodoroSessionHistoryItemProps) {
  const startTime = new Date(session.startedAt).toLocaleTimeString(POMODORO_DISPLAY_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const endTime = session.endedAt
    ? new Date(session.endedAt).toLocaleTimeString(POMODORO_DISPLAY_LOCALE, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "--:--";

  const statusBadge = {
    COMPLETED: {
      label: "Completed",
      icon: CheckCircle,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    STOPPED: {
      label: "Stopped early",
      icon: AlertCircle,
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    SKIPPED: {
      label: "Skipped",
      icon: FastForward,
      className: "bg-slate-50 text-slate-600 border-slate-200",
    },
  }[session.status];

  const StatusIcon = statusBadge.icon;
  const isFocus = session.sessionType === "FOCUS";
  const taskTitle = session.taskTitle || (isFocus ? "Free focus session" : "Break");
  const hasNotes = Boolean(session.notes?.trim());
  const sessionLabel = {
    FOCUS: "Focus",
    SHORT_BREAK: "Short break",
    LONG_BREAK: "Long break",
  }[session.sessionType];

  return (
    <details
      className="group rounded-xl border border-slate-100/90 bg-slate-50/50 text-xs transition-all hover:border-slate-200 open:border-slate-200"
    >
      <summary
        aria-label={`View session details for ${taskTitle} at ${startTime}${showDates ? ` on ${new Date(session.startedAt).toLocaleDateString(POMODORO_DISPLAY_LOCALE)}` : ""}`}
        className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl p-3 hover:bg-slate-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden"
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
                {taskTitle}
              </span>
              {session.projectName && (
                <span className="text-[10px] text-slate-400 shrink-0">
                  • {session.projectName}
                </span>
              )}
            </div>

            {showDates && <span className="mt-1 block text-[11px] text-slate-500">{new Date(session.startedAt).toLocaleDateString(POMODORO_DISPLAY_LOCALE)}</span>}
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span>{startTime} - {endTime}</span>
              <span>•</span>
              <span className="font-medium text-slate-600">
                {session.durationMinutes} minutes
              </span>
            </div>
            {hasNotes && (
              <span className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
                <StickyNote aria-hidden="true" className="size-3" /> Has notes
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Badge
            variant="outline"
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 font-semibold shrink-0 ${statusBadge.className}`}
          >
            <StatusIcon className="size-3" />
            <span>{statusBadge.label}</span>
          </Badge>
          <ChevronDown aria-hidden="true" className="size-3.5 text-slate-400 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="space-y-3 border-t border-slate-200/70 px-3 py-3">
        <dl className="space-y-1.5 text-slate-600">
          <div>
            <dt className="font-semibold text-slate-800">Task</dt>
            <dd className="mt-0.5 whitespace-pre-wrap [overflow-wrap:anywhere]">{taskTitle}</dd>
          </div>
          {session.projectName && (
            <div>
              <dt className="font-semibold text-slate-800">Project</dt>
              <dd className="mt-0.5 [overflow-wrap:anywhere]">{session.projectName}</dd>
            </div>
          )}
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-slate-800">Session type:</dt>
            <dd>{sessionLabel}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-slate-800">Actual duration:</dt>
            <dd>{Math.floor(session.actualSeconds / 60)} minutes {session.actualSeconds % 60} seconds</dd>
          </div>
        </dl>
        <div>
          <h4 className="mb-1.5 font-semibold text-slate-800">Session notes</h4>
          {hasNotes ? (
            <p className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-amber-100 bg-amber-50/50 p-3 leading-relaxed text-slate-700 [overflow-wrap:anywhere]">
              {session.notes}
            </p>
          ) : (
            <p className="text-slate-400">This session has no notes.</p>
          )}
        </div>
      </div>
    </details>
  );
}
