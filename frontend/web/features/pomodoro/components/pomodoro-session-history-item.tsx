"use client";

import { Coffee, StickyNote, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { POMODORO_REPORT_COPY as copy } from "../constants/pomodoro-report";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { formatFocusTime } from "../utils/pomodoro-report";
import { presentPomodoroSession } from "../utils/pomodoro-session-presentation";
import { PomodoroSessionStatusBadge } from "./pomodoro-session-status-badge";

interface PomodoroSessionHistoryItemProps {
  session: PomodoroSessionRecord;
  showDates?: boolean;
  reportView?: boolean;
  timeZone?: string;
  onViewDetails: () => void;
}

export function PomodoroSessionHistoryItem({ session, showDates = false, reportView = false, timeZone, onViewDetails }: PomodoroSessionHistoryItemProps) {
  const details = presentPomodoroSession(session, timeZone);
  const SessionIcon = details.isFocus ? Timer : Coffee;

  return <Button type="button" variant="unstyled" aria-haspopup="dialog" aria-label={copy.viewDetails(details.title)} onClick={onViewDetails}
    className={cn("block w-full min-w-0 shrink-0 rounded-control px-2 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:ring-inset motion-reduce:transition-none", reportView ? "border border-border" : "border border-border bg-background p-3")}>
    <span className="flex min-w-0 items-start gap-3">
      <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-control", details.isFocus ? "bg-muted text-link" : "bg-success-soft text-success-content")}>
        <SessionIcon aria-hidden="true" className="size-4" />
      </span>
      <span className="block min-w-0 flex-1">
        <span className="flex min-w-0 flex-col gap-2 @min-[640px]/pomodoro:flex-row @min-[640px]/pomodoro:items-start @min-[640px]/pomodoro:justify-between @min-[640px]/pomodoro:gap-4">
          <span className="block min-w-0">
            <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere]" title={details.title}>{details.title}</span>
            <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{details.typeLabel}</span>
              {session.projectName && <><span aria-hidden="true">/</span><span className="min-w-0 truncate" title={session.projectName}>{session.projectName}</span></>}
              {details.hasNotes && <span className="inline-flex items-center gap-1"><StickyNote aria-hidden="true" className="size-3" />{copy.hasNotes}</span>}
            </span>
          </span>
          <span className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground tabular-nums">{formatFocusTime(session.actualSeconds)}</span>
            <PomodoroSessionStatusBadge status={session.status} />
          </span>
        </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
            {showDates && <><span>{details.date}</span><span aria-hidden="true">/</span></>}
            <span>{details.startTime} – {details.endTime}</span>
          </span>
      </span>
    </span>
  </Button>;
}
