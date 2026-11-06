"use client";

import { useMemo } from "react";
import { Circle, CircleDot, LockKeyhole, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useFocusTaskOptions } from "../hooks/use-focus-task-options";
import { useFocusPickerCalendarActions } from "../hooks/use-focus-picker-calendar-actions";
import { isCalendarFocusEligible, isProjectFocusEligible } from "../utils/focus-task";
import { POMODORO_TASK_MESSAGES } from "../constants/pomodoro-task";
import type { FocusPickerTask } from "../types/focus-picker";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";
import { PomodoroFocusTaskPanel } from "./pomodoro-focus-task-panel";

export function PomodoroTaskPicker({ open, onCreateCalendarTask, twoColumns = false }: {
  open: boolean;
  onCreateCalendarTask: () => void;
  twoColumns?: boolean;
}) {
  const { activeTask, selectFocusTask, status, busy, isReady } = usePomodoroSessionActions();
  const { userId, calendar, project } = useFocusTaskOptions("all", open);
  const actions = useFocusPickerCalendarActions();
  const selectionLocked = status !== "IDLE";
  const disabled = busy || !isReady || actions.saving || selectionLocked;
  const calendarEntries = useMemo<FocusPickerTask[]>(() => (calendar.data ?? [])
    .filter(event => isCalendarFocusEligible(event, userId ?? "", "all"))
    .map(event => ({ source: "calendar", id: "calendar:" + event.id, event })), [calendar.data, userId]);
  const projectEntries = useMemo<FocusPickerTask[]>(() => (project.data ?? [])
    .filter(({ task }) => isProjectFocusEligible(task, userId ?? "", "all"))
    .map(({ task, project: parent }) => ({ source: "project", id: "project:" + task.id, task, project: parent })), [project.data, userId]);
  const freeCurrent = !activeTask;

  return <section hidden={!open} aria-label="Choose your focus" className="@container/task-panels space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="flex min-w-0 flex-1 basis-64 items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        {selectionLocked && <LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />}
        {selectionLocked ? POMODORO_TASK_MESSAGES.selectionLocked : POMODORO_TASK_MESSAGES.selectionHint}
      </p>
      <Button type="button" variant={freeCurrent ? "secondary" : "outline"} disabled={disabled} aria-pressed={freeCurrent}
        className="min-h-10 gap-2" onClick={() => void selectFocusTask(null)}>
        {freeCurrent ? <CircleDot aria-hidden="true" className="size-4 text-info-content" /> : <Circle aria-hidden="true" className="size-4 text-muted-foreground" />}
        <Timer aria-hidden="true" className="size-4" />Free focus
      </Button>
    </div>
    <div className={cn("grid min-w-0 grid-cols-1 items-stretch gap-5", twoColumns && "@min-[900px]/task-panels:grid-cols-2")}>
      <PomodoroFocusTaskPanel source="calendar" entries={calendarEntries} loading={calendar.isLoading} error={calendar.isError} disabled={disabled}
        onRetry={() => void calendar.refetch()} onCreateTask={onCreateCalendarTask} onDeleteCalendarTask={actions.requestDelete} />
      <PomodoroFocusTaskPanel source="project" entries={projectEntries} loading={project.isLoading} error={project.isError} disabled={disabled}
        onRetry={() => void project.refetch()} />
    </div>
    {actions.error && !actions.deleteCandidate && <p role="alert" className="text-xs text-destructive-content">{actions.error}</p>}
    <AlertDialog open={Boolean(actions.deleteCandidate)} onOpenChange={next => { if (!next) actions.cancelDelete(); }}>
      <AlertDialogContent showCloseButton={false} className="max-w-sm">
        <AlertDialogTitle>Delete Calendar task?</AlertDialogTitle>
        <AlertDialogDescription className="break-words">This removes {actions.deleteCandidate?.title} from Calendar.</AlertDialogDescription>
        {actions.error && <p role="alert" className="text-xs text-destructive-content">{actions.error}</p>}
        <AlertDialogFooter>
          <Button type="button" variant="outline" disabled={actions.saving} onClick={actions.cancelDelete}>Cancel</Button>
          <Button type="button" variant="destructive" loading={actions.saving} disabled={disabled} onClick={() => void actions.confirmDelete()}>Delete task</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
