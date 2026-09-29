"use client";

import { useCallback, useState } from "react";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateCalendarTaskCompletion } from "@/features/calendar/api/calendar.api";
import { calendarKeys } from "@/features/calendar/hooks/use-calendar-queries";
import { updateTask } from "@/features/project/api/task.api";
import { TaskStatus } from "@/features/project/types/project";
import type { PomodoroActiveTask, PomodoroTaskAction } from "../types/pomodoro";

export function taskActionErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    if (error.response?.status === 403) return "Bạn không có quyền cập nhật trạng thái task này.";
    const message = error.response?.data?.message;
    if (message === "Complete all subtasks before marking this task as done.") {
      return "Hãy hoàn thành tất cả task con trước khi hoàn thành task này.";
    }
    if (message === "Completed or cancelled tasks are read-only") {
      return "Task đã hoàn thành hoặc đã hủy. Hãy tải lại danh sách task.";
    }
    return typeof message === "string" ? message : "Không cập nhật được task. Hãy thử lại.";
  }
  return error instanceof Error ? error.message : "Không cập nhật được task. Hãy thử lại.";
}

type FinishActiveTask = (updateSource: (task: PomodoroActiveTask) => Promise<void>) => Promise<void>;

export function usePomodoroTaskActions(finishActiveTask: FinishActiveTask) {
  const queryClient = useQueryClient();
  const [taskRevision, setTaskRevision] = useState(0);

  const refreshSource = useCallback((task: PomodoroActiveTask) => {
    setTaskRevision((revision) => revision + 1);
    if (task.projectId) {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks", task.id] });
    } else {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    }
  }, [queryClient]);

  const undoCalendarCompletion = useCallback(async (task: PomodoroActiveTask) => {
    try {
      await updateCalendarTaskCompletion(task.calendarEventId!, false);
      refreshSource(task);
      toast.success("Đã đánh dấu task chưa hoàn thành.");
    } catch (error) {
      toast.error(taskActionErrorMessage(error));
    }
  }, [refreshSource]);

  const runTaskAction = useCallback(async (action: PomodoroTaskAction) => {
    let updatedTask: PomodoroActiveTask | undefined;
    await finishActiveTask(async (task) => {
      if (task.projectId) {
        await updateTask(task.id, { status: action === "REVIEW" ? TaskStatus.IN_REVIEW : TaskStatus.DONE });
      } else if (task.calendarEventId && action === "COMPLETE") {
        await updateCalendarTaskCompletion(task.calendarEventId, true);
      } else {
        throw new Error("Task này chưa liên kết với Calendar hoặc Project.");
      }
      updatedTask = task;
    });
    if (!updatedTask) return;
    const task = updatedTask;
    refreshSource(task);
    toast.success(action === "REVIEW" ? "Đã gửi task duyệt." : "Đã hoàn thành task.",
      task.projectId ? undefined : {
        duration: 8000,
        action: { label: "Hoàn tác", onClick: () => void undoCalendarCompletion(task) },
      },
    );
  }, [finishActiveTask, refreshSource, undoCalendarCompletion]);

  return { runTaskAction, taskRevision };
}
