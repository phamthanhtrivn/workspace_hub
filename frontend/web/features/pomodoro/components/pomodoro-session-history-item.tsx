"use client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

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
      className: "bg-success-soft text-success-content border-border",
    },
    STOPPED: {
      label: "Stopped early",
      icon: AlertCircle,
      className: "bg-warning-soft text-warning-content border-border",
    },
    SKIPPED: {
      label: "Skipped",
      icon: FastForward,
      className: "bg-background text-muted-foreground border-border",
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
    <Collapsible
      className="group rounded-panel border border-border bg-background text-xs transition-all hover:border-border open:border-border"
    >
      <CollapsibleTrigger render={<Button type="button" variant="ghost" className="group h-auto w-full justify-between whitespace-normal text-left" />}
        aria-label={`View session details for ${taskTitle} at ${startTime}${showDates ? ` on ${new Date(session.startedAt).toLocaleDateString(POMODORO_DISPLAY_LOCALE)}` : ""}`}
        className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-panel p-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div
            className={`size-2.5 rounded-full shrink-0 ${
              isFocus
                ? "bg-link ring-2 ring-ring"
                : "bg-success-content ring-2 ring-success-outline"
            }`}
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-foreground truncate">
                {taskTitle}
              </span>
              {session.projectName && (
                <span className="text-xs text-muted-foreground shrink-0">
                  • {session.projectName}
                </span>
              )}
            </div>

            {showDates && <span className="mt-1 block text-xs text-muted-foreground">{new Date(session.startedAt).toLocaleDateString(POMODORO_DISPLAY_LOCALE)}</span>}
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{startTime} - {endTime}</span>
              <span>•</span>
              <span className="font-medium text-muted-foreground">
                {session.durationMinutes} minutes
              </span>
            </div>
            {hasNotes && (
              <span className="mt-1 flex items-center gap-1 text-xs text-warning-content">
                <StickyNote aria-hidden="true" className="size-3" /> Has notes
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Badge
            variant="outline"
            className={`flex items-center gap-1 text-xs px-2 py-0.5 font-semibold shrink-0 ${statusBadge.className}`}
          >
            <StatusIcon className="size-3" />
            <span>{statusBadge.label}</span>
          </Badge>
          <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
      <div className="space-y-3 border-t border-border/70 px-3 py-3">
        <dl className="space-y-1.5 text-muted-foreground">
          <div>
            <dt className="font-semibold text-foreground">Task</dt>
            <dd className="mt-0.5 whitespace-pre-wrap [overflow-wrap:anywhere]">{taskTitle}</dd>
          </div>
          {session.projectName && (
            <div>
              <dt className="font-semibold text-foreground">Project</dt>
              <dd className="mt-0.5 [overflow-wrap:anywhere]">{session.projectName}</dd>
            </div>
          )}
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-foreground">Session type:</dt>
            <dd>{sessionLabel}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-foreground">Actual duration:</dt>
            <dd>{Math.floor(session.actualSeconds / 60)} minutes {session.actualSeconds % 60} seconds</dd>
          </div>
        </dl>
        <div>
          <h4 className="mb-1.5 font-semibold text-foreground">Session notes</h4>
          {hasNotes ? (
            <p className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-warning-soft/50 p-3 leading-relaxed text-foreground [overflow-wrap:anywhere]">
              {session.notes}
            </p>
          ) : (
            <p className="text-muted-foreground">This session has no notes.</p>
          )}
        </div>
      </div>
    </CollapsibleContent>
    </Collapsible>
  );
}
