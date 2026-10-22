"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import { calendarKeys } from "@/features/calendar/hooks/use-calendar-queries";
import { POMODORO_TASK_MESSAGES } from "@/features/pomodoro/constants/pomodoro-task";
import { createDashboardQuickTask } from "../api/dashboard.api";
import { DASHBOARD_QUICK_TASK as copy } from "../constants/dashboard-quick-task";
import type { DashboardQuickTaskInput } from "../schemas/dashboard-quick-task.schema";

export function useDashboardQuickTask(zone: string, onCreated: () => void) {
  const userId = useAppSelector((state) => state.auth.userId);
  const queryClient = useQueryClient();
  const saving = useRef(false);
  const mutation = useMutation({
    mutationFn: (input: DashboardQuickTaskInput) => createDashboardQuickTask(input, userId ?? "", zone),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["pomodoro", "focus-tasks"] });
      toast.success(copy.created);
      onCreated();
    },
  });
  const createTask = async (input: DashboardQuickTaskInput) => {
    if (saving.current) return;
    saving.current = true;
    try {
      await mutation.mutateAsync(input);
    } catch {
      // The dialog keeps the draft and shows the mutation error for retry.
    } finally {
      saving.current = false;
    }
  };
  const error = mutation.error?.message === POMODORO_TASK_MESSAGES.personalCalendarRequired
    ? mutation.error.message
    : mutation.isError ? copy.createFailed : "";
  return { createTask, isPending: mutation.isPending, error };
}
