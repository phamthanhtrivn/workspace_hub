"use client";

import { useMemo, useState } from "react";
import {
  TaskStatus,
  TaskType,
  isTerminalTaskStatus,
  type ProjectMember,
  type Task,
} from "@/features/project/types/project";
import {
  TASK_STATUS_CHART_CONFIG,
  TASK_PRIORITY_CHART_CONFIG,
} from "@/features/project/constants/task.constants";

const DAY = 24 * 60 * 60 * 1000;

export function isWithinLastDays(
  value: string | undefined,
  referenceTime: number,
  days = 7,
): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  return time >= referenceTime - days * DAY && time <= referenceTime;
}

export function getTaskType(task: Task): "Task" | "Epic" | "Subtask" {
  if (task.taskType === TaskType.EPIC) return "Epic";
  if (task.taskType === TaskType.SUBTASK) return "Subtask";
  return "Task";
}

export function useProjectSummaryMetrics(
  tasks: Task[],
  members: ProjectMember[],
  options?: { isSoftware?: boolean },
) {
  const [now] = useState(() => Date.now());
  const isSoftware = options?.isSoftware ?? false;

  return useMemo(() => {
    const activeTasks = tasks.filter((task) => !task.archived);
    const workItems = isSoftware
      ? activeTasks.filter((task) => !task.isParentTask)
      : activeTasks;

    const completed = workItems.filter((task) => task.status === TaskStatus.DONE);
    const cancelled = workItems.filter((task) => task.status === TaskStatus.CANCELLED);
    const terminal = workItems.filter((task) => isTerminalTaskStatus(task.status));

    const overdue = activeTasks.filter(
      (task) =>
        task.dueDate &&
        !isTerminalTaskStatus(task.status) &&
        new Date(task.dueDate).getTime() < now,
    );

    const dueSoon = workItems
      .filter((task) => {
        if (!task.dueDate || isTerminalTaskStatus(task.status)) return false;
        const due = new Date(task.dueDate).getTime();
        return due >= now && due <= now + 7 * DAY;
      })
      .sort(
        (a, b) =>
          new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime(),
      );

    const unscheduled = activeTasks.filter(
      (task) => !task.startDate && !task.dueDate,
    );

    const statusItems = TASK_STATUS_CHART_CONFIG.map((cfg) => ({
      label: cfg.label,
      value: workItems.filter((task) => task.status === cfg.status).length,
      color: cfg.color,
    }));
    const totalStatus = statusItems.reduce((sum, item) => sum + item.value, 0);

    const completionPercent = (isSoftware ? totalStatus : activeTasks.length)
      ? Math.round(
          (terminal.length / (isSoftware ? totalStatus : activeTasks.length)) *
            100,
        )
      : 0;

    const priorityItems = TASK_PRIORITY_CHART_CONFIG.map((cfg) => ({
      label: cfg.label,
      value: workItems.filter((task) => task.priority === cfg.priority).length,
      color: cfg.color,
    }));
    const maxPriority = Math.max(1, ...priorityItems.map((item) => item.value));

    const typeItems = ["Task", "Epic", "Subtask"].map((label) => ({
      label,
      value: activeTasks.filter((task) => getTaskType(task) === label).length,
    }));
    const maxType = Math.max(1, ...typeItems.map((item) => item.value));

    const recentTasks = [...activeTasks]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime(),
      )
      .slice(0, 5);

    const workload = members
      .map((member) => ({
        name: member.displayName,
        count: workItems.filter((task) =>
          task.assignees?.some((assignee) => assignee.userId === member.userId),
        ).length,
      }))
      .filter((item) => item.count > 0);

    const unassignedCount = workItems.filter((task) => !task.assignees?.length).length;
    const workloadItems = [
      { name: "Chưa phân công", count: unassignedCount },
      ...workload,
    ];

    const maxWorkload = Math.max(1, ...workload.map((item) => item.count));
    const maxWorkloadItems = Math.max(1, ...workloadItems.map((item) => item.count));

    const completedRecently = completed.filter((task) =>
      isWithinLastDays(task.updatedAt, now),
    );
    const updatedRecently = workItems.filter((task) =>
      isWithinLastDays(task.updatedAt, now),
    );
    const createdRecently = workItems.filter((task) =>
      isWithinLastDays(task.createdAt, now),
    );

    const rootTasks = activeTasks.filter((task) => !task.parentTaskId);
    const subtasks = activeTasks.filter((task) => Boolean(task.parentTaskId));

    return {
      now,
      activeTasks,
      workItems,
      rootTasks,
      subtasks,
      completed,
      cancelled,
      terminal,
      overdue,
      dueSoon,
      unscheduled,
      completionPercent,
      donePercent: completionPercent,
      statusItems,
      totalStatus,
      priorityItems,
      maxPriority,
      typeItems,
      maxType,
      recentTasks,
      workload,
      workloadItems,
      maxWorkload,
      maxWorkloadItems,
      completedRecently,
      updatedRecently,
      createdRecently,
    };
  }, [tasks, members, isSoftware, now]);
}
