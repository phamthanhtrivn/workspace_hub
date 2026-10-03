"use client";

import { useState, useId, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { calendarKeys, useCalendarCalendars } from "@/features/calendar/hooks/use-calendar-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { defaultFocusStart, scheduleFocusTask } from "../utils/schedule-task";
import { POMODORO_TASK_SETTINGS } from "../constants/pomodoro-task";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";
import type { PomodoroActiveTask } from "../types/pomodoro";
import { sameFocusTask } from "../utils/focus-task";

export function PomodoroCalendarTaskForm({ focusDurationMinutes, onCreated }: { focusDurationMinutes: number; onCreated: () => void }) {
  const formId = useId();
  const userId = useAppSelector((state) => state.auth.userId);
  const { data: calendars = [], isLoading, isError, refetch } = useCalendarCalendars();
  const personalCalendars = calendars.filter((calendar) => !calendar.projectId && calendar.ownerUserId === userId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [startsAt, setStartsAt] = useState(defaultFocusStart);
  const [sessions, setSessions] = useState<number>(POMODORO_TASK_SETTINGS.defaultCalendarSessions);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdTask, setCreatedTask] = useState<PomodoroActiveTask | null>(null);
  const { startFocus, busy, activeTask, status } = usePomodoroSessionActions();
  const queryClient = useQueryClient();
  const selectedCalendarId = calendarId || personalCalendars.find((calendar) => calendar.isDefault)?.id || personalCalendars[0]?.id || "";

  useEffect(() => {
    if (createdTask && sameFocusTask(createdTask, activeTask) && status === "RUNNING") onCreated();
  }, [createdTask, activeTask, status, onCreated]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (creating || busy || !title.trim()) return;
    setCreating(true);
    setError("");
    try {
      let target = createdTask;
      if (!target) {
        if (!selectedCalendarId) throw new Error("Create a personal calendar before saving a task.");
        const eventId = await scheduleFocusTask({ calendarId: selectedCalendarId, title: title.trim(), description,
          startsAt, pomodoros: sessions, focusDurationMinutes });
        target = { id: eventId, calendarEventId: eventId, source: "CALENDAR_TASK", title: title.trim(), description, canEdit: true };
        // Keep the created ID on retry; a failed start must not create the event twice.
        setCreatedTask(target);
        void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
        void queryClient.invalidateQueries({ queryKey: ["pomodoro", "focus-tasks"] });
      }
      await startFocus(target);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to create the Calendar task.");
    } finally { setCreating(false); }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-3 border-t border-slate-100 pt-4">
      <p className="text-xs leading-relaxed text-slate-500">This task will be saved to your personal Calendar.</p>
      <label className="block space-y-1.5 text-xs font-medium text-slate-600" htmlFor={`${formId}-title`}>Task title
        <Input id={`${formId}-title`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What would you like to work on?" required maxLength={POMODORO_TASK_SETTINGS.maxGoalTitleLength} disabled={creating || Boolean(createdTask)} />
      </label>
      <label className="block space-y-1.5 text-xs font-medium text-slate-600" htmlFor={`${formId}-description`}>Description (optional)
        <Textarea id={`${formId}-description`} value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={2000} disabled={creating || Boolean(createdTask)} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor={`${formId}-calendar`} className="space-y-1 text-xs text-slate-600">Personal calendar
          <select id={`${formId}-calendar`} value={selectedCalendarId} onChange={(event) => setCalendarId(event.target.value)} required disabled={creating || isLoading || Boolean(createdTask)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2">
            {!personalCalendars.length && <option value="">{isLoading ? "Loading calendars…" : "No personal calendar"}</option>}
            {personalCalendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.name}</option>)}
          </select>
        </label>
        <label htmlFor={`${formId}-start`} className="space-y-1 text-xs text-slate-600">Starts at
          <Input id={`${formId}-start`} type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required disabled={creating || Boolean(createdTask)} />
        </label>
        <label htmlFor={`${formId}-sessions`} className="space-y-1 text-xs text-slate-600">Focus sessions
          <Input id={`${formId}-sessions`} type="number" value={sessions} onChange={(event) => setSessions(Number(event.target.value))} min={1} max={POMODORO_TASK_SETTINGS.maxCalendarSessions} step={1} required disabled={creating || Boolean(createdTask)} />
        </label>
        <p className="self-end pb-2 text-xs text-slate-500">{sessions * focusDurationMinutes} minutes scheduled · Breaks excluded</p>
        {isError && <p role="alert" className="text-xs text-rose-600">Unable to load calendars. <button type="button" onClick={() => void refetch()} className="underline">Retry</button></p>}
      </div>
      {createdTask && <p role="status" className="text-xs text-slate-500">Task saved in Calendar. Start it when you are ready; your current focus is kept until you confirm the switch.</p>}
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      <Button type="submit" size="sm" className="w-full" disabled={creating || busy || !title.trim() || !selectedCalendarId}>{creating ? "Preparing focus…" : createdTask ? "Start created task" : "Create task & start focus"}</Button>
    </form>
  );
}
