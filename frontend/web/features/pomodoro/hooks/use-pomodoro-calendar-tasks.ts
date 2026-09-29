"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  cancelCalendarEvent,
  updateCalendarTaskOrder,
} from "@/features/calendar/api/calendar.api";
import { calendarKeys } from "@/features/calendar/hooks/use-calendar-queries";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { cleanTaskDescription } from "@/features/calendar/utils/calendar-event.utils";
import type { PomodoroActiveTask } from "../types/pomodoro";
import { getTodayCalendarTasks } from "../utils/today-calendar-tasks";

interface UsePomodoroCalendarTasksOptions {
  activeTask: PomodoroActiveTask | null;
  onClearTask?: () => void;
  onUpdateActiveTask?: (task: PomodoroActiveTask) => void;
}

export function usePomodoroCalendarTasks({
  activeTask,
  onClearTask,
  onUpdateActiveTask,
}: UsePomodoroCalendarTasksOptions) {
  const queryClient = useQueryClient();
  const [todayTasks, setTodayTasks] = useState<CalendarEvent[]>([]);
  const [calendarTaskError, setCalendarTaskError] = useState(false);
  const [taskOrderError, setTaskOrderError] = useState("");
  const [isSavingTaskOrder, setIsSavingTaskOrder] = useState(false);
  const [refreshRevision, setRefreshRevision] = useState(0);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;
    const refreshTasks = () => {
      const currentRequest = ++requestId;
      void getTodayCalendarTasks()
        .then((events) => {
          if (!mounted || currentRequest !== requestId) return;
          setTodayTasks(events);
          setCalendarTaskError(false);
        })
        .catch(() => {
          if (mounted && currentRequest === requestId) setCalendarTaskError(true);
        });
    };

    refreshTasks();
    window.addEventListener("focus", refreshTasks);
    return () => {
      mounted = false;
      window.removeEventListener("focus", refreshTasks);
    };
  }, [refreshRevision]);

  useEffect(() => {
    if (!activeTask || activeTask.description !== undefined) return;
    const matched = todayTasks.find(
      (event) =>
        event.id === activeTask.calendarEventId ||
        event.id === activeTask.id ||
        (event.sourceId && event.sourceId === activeTask.id),
    );
    const description = cleanTaskDescription(matched?.description);
    if (description) onUpdateActiveTask?.({ ...activeTask, description });
  }, [activeTask, onUpdateActiveTask, todayTasks]);

  const refreshTasks = useCallback(() => {
    setRefreshRevision((revision) => revision + 1);
  }, []);

  const updateLocalTask = useCallback((eventId: string, changes: Partial<CalendarEvent>) => {
    setTodayTasks((current) =>
      current.map((event) => event.id === eventId ? { ...event, ...changes } : event),
    );
  }, []);

  const reorderTasks = useCallback(async (activeId: string, overId: string) => {
    if (activeId === overId || isSavingTaskOrder) return;
    const oldIndex = todayTasks.findIndex((event) => event.id === activeId);
    const newIndex = todayTasks.findIndex((event) => event.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const previousTasks = todayTasks;
    const reorderedTasks = [...todayTasks];
    const [movedTask] = reorderedTasks.splice(oldIndex, 1);
    reorderedTasks.splice(newIndex, 0, movedTask);
    const orderedTasks = reorderedTasks.map((event, taskOrder) => ({
      ...event,
      taskOrder,
    }));

    setTodayTasks(orderedTasks);
    setTaskOrderError("");
    setIsSavingTaskOrder(true);
    try {
      await updateCalendarTaskOrder(orderedTasks.map((event) => event.id));
    } catch {
      setTodayTasks(previousTasks);
      setTaskOrderError("Không lưu được thứ tự task. Hãy thử lại.");
    } finally {
      setIsSavingTaskOrder(false);
    }
  }, [isSavingTaskOrder, todayTasks]);

  const deleteTask = useCallback(async (event: CalendarEvent) => {
    await cancelCalendarEvent(event.id);
    setTodayTasks((current) =>
      current.filter((currentEvent) => currentEvent.id !== event.id),
    );
    void queryClient.invalidateQueries({ queryKey: calendarKeys.all });

    const deletedActiveTask =
      activeTask?.calendarEventId === event.id ||
      activeTask?.id === event.id ||
      Boolean(event.sourceId && activeTask?.id === event.sourceId);
    if (deletedActiveTask) onClearTask?.();
  }, [activeTask, onClearTask, queryClient]);

  return {
    todayTasks,
    calendarTaskError,
    taskOrderError,
    isSavingTaskOrder,
    refreshTasks,
    updateLocalTask,
    reorderTasks,
    deleteTask,
  };
}
