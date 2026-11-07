"use client";

import { useId } from "react";
import { Coffee, StickyNote, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { POMODORO_REPORT_COPY as copy } from "../constants/pomodoro-report";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { formatFocusTime } from "../utils/pomodoro-report";
import { presentPomodoroSession } from "../utils/pomodoro-session-presentation";
import { PomodoroSessionStatusBadge } from "./pomodoro-session-status-badge";

export function PomodoroSessionDetailsDialog({ session, timeZone, onClose }: {
  session: PomodoroSessionRecord | null;
  timeZone?: string;
  onClose: () => void;
}) {
  const descriptionId = useId();
  if (!session) return null;
  const details = presentPomodoroSession(session, timeZone);
  const SessionIcon = details.isFocus ? Timer : Coffee;
  const metadata = [
    { label: copy.startedAt, value: details.startedAt },
    { label: copy.endedAt, value: details.endedAt },
    { label: copy.sessionType, value: details.typeLabel },
    { label: copy.source, value: details.sourceLabel },
  ];

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="flex max-w-xl flex-col" aria-describedby={descriptionId}>
      <DialogHeader className="shrink-0 border-b border-border pr-14">
        <DialogTitle>{copy.sessionDetails}</DialogTitle>
        <DialogDescription id={descriptionId} className="text-xs">{details.date}</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-muted text-link"><SessionIcon aria-hidden="true" className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="whitespace-pre-wrap text-base font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">{details.title}</h3>
            {session.projectName && <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">{session.projectName}</p>}
          </div>
          <PomodoroSessionStatusBadge status={session.status} />
        </div>
        <dl className="grid grid-cols-2 border-y border-border py-5">
          <div className="min-w-0 border-r border-border pr-4">
            <dt className="text-xs text-muted-foreground">{copy.actualDuration}</dt>
            <dd className="mt-2 break-words text-xl font-semibold text-foreground tabular-nums">{formatFocusTime(session.actualSeconds)}</dd>
          </div>
          <div className="min-w-0 pl-4">
            <dt className="text-xs text-muted-foreground">{copy.plannedDuration}</dt>
            <dd className="mt-2 break-words text-xl font-semibold text-foreground tabular-nums">{formatFocusTime(session.durationMinutes * 60)}</dd>
          </div>
        </dl>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6">
          {metadata.map(({ label, value }) => <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-foreground [overflow-wrap:anywhere]">{value}</dd>
          </div>)}
        </dl>
        <section className="border-t border-border pt-5" aria-label={copy.sessionNotes}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><StickyNote aria-hidden="true" className="size-4 text-muted-foreground" />{copy.sessionNotes}</h3>
          {details.hasNotes ? <p className="whitespace-pre-wrap rounded-control bg-muted/50 p-4 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">{session.notes}</p>
            : <p className="text-sm text-muted-foreground">{copy.noNotes}</p>}
        </section>
      </div>
      <DialogFooter className="shrink-0 border-border"><Button type="button" variant="outline" onClick={onClose} data-modal-initial-focus>{copy.close}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
