"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateCalendarEvent } from "@/features/calendar/api/calendar.api";
import { calendarKeys } from "@/features/calendar/hooks/use-calendar-queries";
import { updateTask } from "@/features/project/api/task.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PomodoroActiveTask } from "../types/pomodoro";
import { validateFocusTask } from "../api/focus-tasks.api";
import { useAppSelector } from "@/store/store";
import { POMODORO_TASK_SETTINGS } from "../constants/pomodoro-task";

export function PomodoroTaskEditor({ task, onUpdate, onClose }: { task: PomodoroActiveTask; onUpdate: (task: PomodoroActiveTask) => void; onClose: () => void }) {
  const userId = useAppSelector((state) => state.auth.userId);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !title.trim() || !userId) return;
    setSaving(true);
    setError("");
    try {
      const latest = await validateFocusTask(task, userId);
      if (!latest.canEdit) throw new Error("You do not have permission to edit this task.");
      if (task.projectId) await updateTask(task.id, { title: title.trim(), description: description.trim() });
      else if (task.calendarEventId) await updateCalendarEvent(task.calendarEventId, { title: title.trim(), description: description.trim() || null });
      onUpdate({ ...latest, title: title.trim(), description: description.trim() });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["pomodoro", "focus-tasks"] });
      onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to update task details."); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={(event) => void save(event)} className="space-y-2">
      <Input aria-label="Task title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={POMODORO_TASK_SETTINGS.maxGoalTitleLength} disabled={saving} />
      <Textarea aria-label="Task description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} disabled={saving} />
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2"><Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save details"}</Button><Button type="button" size="sm" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button></div>
    </form>
  );
}
