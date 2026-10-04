"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { getAvailableCalendarFocusTasks, getAvailableProjectFocusTasks } from "../api/focus-tasks.api";
import { taskDateKey } from "@/features/project/utils/task-dates";
import type { PomodoroFocusSource } from "../types/pomodoro";
import { POMODORO_TASK_SETTINGS } from "../constants/pomodoro-task";

export function useFocusTaskOptions(source: PomodoroFocusSource, open: boolean) {
  const userId = useAppSelector((state) => state.auth.userId);
  const day = taskDateKey(new Date().toISOString());
  const calendar = useQuery({
    queryKey: ["pomodoro", "focus-tasks", userId, "calendar", day],
    queryFn: () => getAvailableCalendarFocusTasks(userId!), enabled: Boolean(userId) && open && source === "calendar",
    staleTime: POMODORO_TASK_SETTINGS.taskRefetchInterval, refetchOnWindowFocus: "always",
    refetchInterval: POMODORO_TASK_SETTINGS.taskRefetchInterval,
  });
  const project = useQuery({
    queryKey: ["pomodoro", "focus-tasks", userId, "project", day],
    queryFn: () => getAvailableProjectFocusTasks(userId!), enabled: Boolean(userId) && open && source === "project",
    staleTime: POMODORO_TASK_SETTINGS.taskRefetchInterval, refetchOnWindowFocus: "always",
    refetchInterval: POMODORO_TASK_SETTINGS.taskRefetchInterval,
  });
  return { userId, calendar, project };
}
