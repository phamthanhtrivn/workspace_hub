"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelCalendarEvent, updateCalendarTaskOrder } from "@/features/calendar/api/calendar.api";
import { calendarKeys } from "@/features/calendar/hooks/use-calendar-queries";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";
import { PomodoroCalendarTaskList } from "./pomodoro-calendar-task-list";
import { PomodoroCalendarTaskForm } from "./pomodoro-calendar-task-form";
import { PomodoroTaskEmptyState, PomodoroTaskFilterControls, type PomodoroTaskFilters } from "./pomodoro-task-filters";
import { isCalendarFocusEligible, toCalendarFocusTask } from "../utils/focus-task";

interface PomodoroCalendarTaskPanelProps {
  tasks: CalendarEvent[];
  userId: string;
  focusDurationMinutes: number;
  filters: PomodoroTaskFilters;
  onFiltersChange: (filters: PomodoroTaskFilters) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function PomodoroCalendarTaskPanel({ tasks, userId, focusDurationMinutes, filters, onFiltersChange,
  isLoading, isError, onRetry }: PomodoroCalendarTaskPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const { activeTask, startFocus, stopSession, selectTask, busy, isReady } = usePomodoroSessionActions();
  const queryClient = useQueryClient();
  const query = filters.search.trim().toLocaleLowerCase();
  const matching = tasks.filter((event) => isCalendarFocusEligible(event, userId, filters.scope) && event.title.toLocaleLowerCase().includes(query));

  const refreshCalendar = () => {
    void queryClient.invalidateQueries({ queryKey: ["pomodoro", "focus-tasks"] });
    void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
  };
  const deleteTask = async (event: CalendarEvent) => {
    if (activeTask?.calendarEventId === event.id) await stopSession();
    await cancelCalendarEvent(event.id);
    if (activeTask?.calendarEventId === event.id) await selectTask(null);
    refreshCalendar();
  };
  const reorder = async (activeId: string, overId: string) => {
    if (savingOrder || busy) return;
    const ordered = [...tasks];
    const from = ordered.findIndex((event) => event.id === activeId);
    const to = ordered.findIndex((event) => event.id === overId);
    if (from < 0 || to < 0 || from === to) return;
    ordered.splice(to, 0, ordered.splice(from, 1)[0]);
    setSavingOrder(true);
    setOrderError("");
    try { await updateCalendarTaskOrder(ordered.map((event) => event.id)); refreshCalendar(); }
    catch { setOrderError("Unable to save task order. Please try again."); }
    finally { setSavingOrder(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h4 className="text-sm font-semibold text-slate-800">Personal Calendar tasks</h4>
          <p className="mt-1 text-xs text-slate-500">Choose a scheduled task from your personal Calendar.</p></div>
        <Button size="sm" variant="outline" disabled={busy} aria-expanded={showForm} onClick={() => setShowForm((current) => !current)}>
          {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}{showForm ? "Close form" : "New calendar task"}
        </Button>
      </div>
      {showForm && <PomodoroCalendarTaskForm focusDurationMinutes={focusDurationMinutes} onCreated={() => setShowForm(false)} />}
      <PomodoroTaskFilterControls sourceLabel="Calendar" filters={filters} onChange={onFiltersChange} />
      {isLoading && <p role="status" className="text-xs text-slate-500">Loading Calendar tasks…</p>}
      {isError && <p role="alert" className="text-xs text-rose-600">Unable to load Calendar tasks. <button onClick={onRetry} className="underline">Retry</button></p>}
      {!isLoading && !isError && matching.length === 0 && <PomodoroTaskEmptyState sourceLabel="Calendar" filters={filters} onChange={onFiltersChange} />}
      {matching.length > 0 && <PomodoroCalendarTaskList tasks={matching} activeEventId={activeTask?.calendarEventId} isSaving={savingOrder || busy || !isReady}
        onSelect={(event) => { if (!busy && isReady) void startFocus(toCalendarFocusTask(event)); }} onDelete={deleteTask} onReorder={(active, over) => void reorder(active, over)} />}
      {orderError && <p role="alert" className="text-xs text-rose-600">{orderError}</p>}
    </div>
  );
}
