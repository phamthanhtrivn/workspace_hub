"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Target, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePomodoroSession } from "./pomodoro-session-provider";
import { PomodoroTaskPicker } from "./pomodoro-task-picker";
import { PomodoroTaskActions } from "./pomodoro-task-actions";
import { PomodoroTaskEditor } from "./pomodoro-task-editor";
import { TaskFocusHistory } from "./task-focus-history";
import { focusTaskLink } from "../utils/focus-task";
import { MAX_POMODORO_NOTES_LENGTH } from "../utils/pomodoro-notes";

export function PomodoroActiveTaskCard() {
  const { activeTask, config, status, busy, notes, setNotes, updateActiveTask, runTaskAction, focusRevision } = usePomodoroSession();
  const focusContext = `${focusRevision}:${activeTask?.id ?? "free"}`;
  const [pickerContext, setPickerContext] = useState<string | null>(null);
  const [editingContext, setEditingContext] = useState<string | null>(null);
  const hasFocus = Boolean(activeTask) || status !== "IDLE";
  const showPicker = !hasFocus || pickerContext === focusContext;
  const editing = editingContext === focusContext;
  const link = activeTask ? focusTaskLink(activeTask) : null;
  return (
    <Card className="block w-full min-w-0 rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Target className="size-4 text-blue-700" />{hasFocus ? "Current focus" : "Choose your focus"}</h3>
        {hasFocus && <Button size="sm" variant="outline" disabled={busy} aria-expanded={showPicker} onClick={() => {
          setPickerContext(showPicker ? null : focusContext);
          setEditingContext(null);
        }}>{showPicker ? "Back to current focus" : "Change focus"}</Button>}
      </div>
      {activeTask && <div className="space-y-3">
        <p className="text-xs font-medium text-blue-700">{activeTask.projectId ? `Project task · ${activeTask.projectName ?? "Project"}` : activeTask.calendarEventId ? "Calendar task" : "Personal goal"}</p>
        {editing ? <PomodoroTaskEditor key={activeTask.id} task={activeTask} onUpdate={updateActiveTask} onClose={() => setEditingContext(null)} /> : <>
          <div className="flex items-start justify-between gap-2"><h4 className="break-words text-lg font-semibold text-slate-900">{activeTask.title}</h4>
            {activeTask.canEdit && <Button size="sm" variant="ghost" disabled={busy} aria-label="Edit task details" onClick={() => setEditingContext(focusContext)}><Pencil className="size-3.5" /></Button>}
          </div>
          {activeTask.description && <p className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{activeTask.description}</p>}
        </>}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {link && <Link href={link} className="font-medium text-blue-700 hover:underline">Open original task</Link>}
          {activeTask.projectStatus && <span className="text-slate-500">{activeTask.projectStatus === "IN_PROGRESS" ? "In progress" : activeTask.projectStatus.toLowerCase().replaceAll("_", " ")}</span>}
        </div>
        {!activeTask.projectId && !activeTask.calendarEventId && <p className="text-xs text-slate-500">{activeTask.completedPomodoros ?? 0} completed focus sessions</p>}
        <PomodoroTaskActions task={activeTask} timerStatus={status} disabled={busy} onAction={runTaskAction} />
        {(activeTask.projectId || activeTask.calendarEventId) && <TaskFocusHistory target={activeTask.projectId ? { taskId: activeTask.id } : { eventId: activeTask.calendarEventId }} />}
      </div>}
      {!activeTask && hasFocus && <div className="space-y-2 rounded-xl bg-slate-50 px-4 py-5">
        <h4 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Timer className="size-4 text-blue-700" />Free focus</h4>
        <p className="text-xs leading-relaxed text-slate-500">This session is not linked to a Calendar or Project task.</p>
      </div>}
      {hasFocus && <label className="mt-4 mb-4 block space-y-1.5 text-xs font-medium text-slate-600">Session notes
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes for this focus session…" maxLength={MAX_POMODORO_NOTES_LENGTH} rows={2} disabled={busy} />
      </label>}
      <PomodoroTaskPicker open={showPicker} focusDurationMinutes={config.focusDuration} />
    </Card>
  );
}
