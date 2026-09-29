"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { taskDateKey } from "@/features/project/utils/task-dates";
import { getTodayProjectTasks } from "../utils/today-project-tasks";

export function usePomodoroProjectTasks() {
  const userId = useAppSelector((state) => state.auth.userId);
  return useQuery({
    queryKey: ["projects", "pomodoro-today", userId, taskDateKey(new Date().toISOString())],
    queryFn: () => getTodayProjectTasks(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: "always",
  });
}
