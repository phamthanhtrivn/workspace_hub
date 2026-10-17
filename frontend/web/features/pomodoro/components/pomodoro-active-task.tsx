"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Pencil, Target, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePomodoroSession } from "./pomodoro-session-provider";
import { PomodoroTaskPicker } from "./pomodoro-task-picker";
import { PomodoroFocusDialog, type PomodoroFocusDialogView } from "./pomodoro-focus-dialog";
import { PomodoroTaskActions } from "./pomodoro-task-actions";
import { PomodoroTaskEditor } from "./pomodoro-task-editor";
import { TaskFocusHistory } from "./task-focus-history";
import { focusTaskLink } from "../utils/focus-task";
import { MAX_POMODORO_NOTES_LENGTH } from "../utils/pomodoro-notes";

export function PomodoroActiveTaskCard() {
  const { activeTask, config, status, busy, notes, setNotes, updateActiveTask, runTaskAction, focusRevision } = usePomodoroSession();
  const focusContext = `${focusRevision}:${activeTask?.id ?? "free"}`;
  const [dialog, setDialog] = useState<{ context: string; view: PomodoroFocusDialogView } | null>(null);
  const [editingContext, setEditingContext] = useState<string | null>(null);
  const hasFocus = Boolean(activeTask) || status !== "IDLE";
  const dialogOpen = dialog?.context === focusContext;
  const closeDialog = useCallback(() => setDialog(null), []);
  const editing = editingContext === focusContext;
  const link = activeTask ? focusTaskLink(activeTask) : null;
  return (
    <Card className="block w-full min-w-0 rounded-panel border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Target className="size-4 text-info" />{hasFocus ? "Current focus" : "Choose your focus"}</h3>
        {hasFocus && <Button size="sm" variant="outline" disabled={busy} aria-haspopup="dialog" aria-expanded={dialogOpen} onClick={() => {
          setDialog({ context: focusContext, view: "choose" });
          setEditingContext(null);
        }}>Change focus</Button>}
      </div>
      {activeTask && <div className="space-y-3">
        <p className="text-xs font-medium text-info">{activeTask.projectId ? `Project task · ${activeTask.projectName ?? "Project"}` : activeTask.calendarEventId ? "Calendar task" : "Personal goal"}</p>
        {editing ? <PomodoroTaskEditor key={activeTask.id} task={activeTask} onUpdate={updateActiveTask} onClose={() => setEditingContext(null)} /> : <>
          <div className="flex items-start justify-between gap-2"><h4 className="break-words text-lg font-semibold text-foreground">{activeTask.title}</h4>
            {activeTask.canEdit && <Button size="sm" variant="ghost" disabled={busy} aria-label="Edit task details" onClick={() => setEditingContext(focusContext)}><Pencil className="size-3.5" /></Button>}
          </div>
          {activeTask.description && <p className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{activeTask.description}</p>}
        </>}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {link && <Link href={link} className="font-medium text-info hover:underline">Open original task</Link>}
          {activeTask.projectStatus && <span className="text-muted-foreground">{activeTask.projectStatus === "IN_PROGRESS" ? "In progress" : activeTask.projectStatus.toLowerCase().replaceAll("_", " ")}</span>}
        </div>
        {!activeTask.projectId && !activeTask.calendarEventId && <p className="text-xs text-muted-foreground">{activeTask.completedPomodoros ?? 0} completed focus sessions</p>}
        <PomodoroTaskActions task={activeTask} timerStatus={status} disabled={busy} onAction={runTaskAction} />
        {(activeTask.projectId || activeTask.calendarEventId) && <TaskFocusHistory target={activeTask.projectId ? { taskId: activeTask.id } : { eventId: activeTask.calendarEventId }} />}
      </div>}
      {!activeTask && hasFocus && <div className="space-y-2 rounded-panel bg-background px-4 py-5">
        <h4 className="flex items-center gap-2 text-base font-semibold text-foreground"><Timer className="size-4 text-info" />Free focus</h4>
        <p className="text-xs leading-relaxed text-muted-foreground">This session is not linked to a Calendar or Project task.</p>
      </div>}
      {hasFocus && <label className="mt-4 mb-4 block space-y-1.5 text-xs font-medium text-muted-foreground">Session notes
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes for this focus session…" maxLength={MAX_POMODORO_NOTES_LENGTH} rows={2} disabled={busy} />
      </label>}
      {!hasFocus && <PomodoroTaskPicker open={!dialogOpen} onCreateCalendarTask={() => setDialog({ context: focusContext, view: "create" })} />}
      {dialogOpen && <PomodoroFocusDialog key={focusContext} initialView={dialog.view} focusDurationMinutes={config.focusDuration} onClose={closeDialog} />}
    </Card>
  );
}
