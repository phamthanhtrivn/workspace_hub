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
    if (error.response?.status === 403) return "You do not have permission to update this task's status.";
    const message = error.response?.data?.message;
    if (message === "Complete all subtasks before marking this task as done.") {
      return "Complete all subtasks before marking this task as done.";
    }
    if (message === "Completed or cancelled tasks are read-only") {
      return "This task is already completed or cancelled. Please reload the task list.";
    }
    return typeof message === "string" ? message : "Unable to update the task. Please try again.";
  }
  return error instanceof Error ? error.message : "Unable to update the task. Please try again.";
}

type FinishActiveTask = (updateSource: (task: PomodoroActiveTask) => Promise<void>) => Promise<void>;

export function usePomodoroTaskActions(finishActiveTask: FinishActiveTask) {
  const queryClient = useQueryClient();
  const [taskRevision, setTaskRevision] = useState(0);

  const refreshSource = useCallback((task: PomodoroActiveTask) => {
    setTaskRevision((revision) => revision + 1);
    void queryClient.invalidateQueries({ queryKey: ["pomodoro", "focus-tasks"] });
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
      toast.success("Task marked as incomplete.");
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
        throw new Error("This task is not linked to Calendar or a project.");
      }
      updatedTask = task;
    });
    if (!updatedTask) return;
    const task = updatedTask;
    refreshSource(task);
    toast.success(action === "REVIEW" ? "Task submitted for review." : "Task completed.",
      task.projectId ? undefined : {
        duration: 8000,
        action: { label: "Undo", onClick: () => void undoCalendarCompletion(task) },
      },
    );
  }, [finishActiveTask, refreshSource, undoCalendarCompletion]);

  return { runTaskAction, taskRevision };
}
