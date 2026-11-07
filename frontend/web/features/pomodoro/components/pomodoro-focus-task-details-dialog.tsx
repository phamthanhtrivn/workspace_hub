"use client";

import Link from "next/link";
import { ArrowUpRight, CircleDot, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarEventReadonlyDetails } from "@/features/calendar/components/modal/calendar-event-readonly-details";
import { formatCalendarEventRange } from "@/features/calendar/utils/calendar-date.utils";
import { TaskReadonlyDetails } from "@/features/project/components/task-detail/task-readonly-details";
import { POMODORO_TASK_MESSAGES } from "../constants/pomodoro-task";
import type { FocusPickerTask } from "../types/focus-picker";
import { focusTaskLink, toCalendarFocusTask, toProjectFocusTask } from "../utils/focus-task";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";
import { PomodoroTaskSourceBadge } from "./pomodoro-task-source-badge";

export function PomodoroFocusTaskDetailsDialog({ entry, current, disabled, onSelect, onDelete, onClose }: {
  entry: FocusPickerTask;
  current: boolean;
  disabled: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { status } = usePomodoroSessionActions();
  const target = entry.source === "calendar" ? toCalendarFocusTask(entry.event) : toProjectFocusTask(entry.task, entry.project);
  const link = focusTaskLink(target);
  const selectionLocked = status !== "IDLE";

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="flex max-w-xl flex-col">
      <DialogHeader className="shrink-0 space-y-3 border-b border-border pr-14">
        <DialogTitle className="break-words [overflow-wrap:anywhere]">{target.title}</DialogTitle>
        <PomodoroTaskSourceBadge task={target} project={entry.source === "project" ? entry.project : undefined} />
      </DialogHeader>
      <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-5 py-4">
        {entry.source === "calendar" ? <>
          <p className="text-sm text-muted-foreground">{formatCalendarEventRange(entry.event, "en")}</p>
          <CalendarEventReadonlyDetails event={entry.event} />
        </> : <TaskReadonlyDetails task={entry.task} projectId={entry.project.id} />}

      </div>
      <DialogFooter className="shrink-0 flex-wrap justify-between gap-3">
        {entry.source === "calendar" && <Button type="button" variant="ghost" disabled={disabled} onClick={() => { onClose(); onDelete(); }} className="text-destructive-content">
          <Trash2 aria-hidden="true" className="size-4" />Delete task
        </Button>}
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          {link && <Button type="button" variant="outline" asChild data-modal-initial-focus><Link href={link} onClick={onClose}>Open task<ArrowUpRight aria-hidden="true" className="size-4" /></Link></Button>}
          <Button type="button" variant={current ? "outline" : "default"} aria-pressed={current} disabled={disabled || selectionLocked}
            disabledReason={selectionLocked ? POMODORO_TASK_MESSAGES.selectionLocked : undefined} onClick={onSelect}>
            <CircleDot aria-hidden="true" className="size-4" />{current ? "Remove from focus" : "Select for focus"}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
