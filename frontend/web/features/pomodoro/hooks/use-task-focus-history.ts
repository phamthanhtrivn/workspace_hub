"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { listCalendarPomodoroSessions } from "@/features/calendar/api/calendar.api";
import { POMODORO_TASK_SETTINGS } from "../constants/pomodoro-task";

export interface TaskFocusHistoryTarget { taskId?: string; eventId?: string }

export function useTaskFocusHistory(target: TaskFocusHistoryTarget, page: number, revision: number) {
  const userId = useAppSelector((state) => state.auth.userId);
  return useQuery({
    queryKey: ["pomodoro", "task-history", userId, target.taskId, target.eventId, page, revision],
    enabled: Boolean(userId && (target.taskId || target.eventId)),
    queryFn: ({ signal }) => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - POMODORO_TASK_SETTINGS.historyDays);
      return listCalendarPomodoroSessions({ ...target, startAt: start.toISOString(), endAt: end.toISOString(), page,
        limit: POMODORO_TASK_SETTINGS.historyPageSize }, signal);
    },
    staleTime: 30_000,
  });
}
