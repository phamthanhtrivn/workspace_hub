"use client";

import { useMemo } from "react";
import {
  type Task,
  TaskStatus,
  type TaskDependency,
} from "@/features/project/types/project";
import { taskDateKey } from "@/features/project/utils/task-dates";
import { TASK_STATUS_COLORS } from "@/features/project/constants/task.constants";

export const GANTT_DAY_WIDTH = 44;
export const GANTT_LABEL_WIDTH = 250;

export interface GanttDayColumn {
  date: Date;
  isoKey: string;
  dayNumberFormatted: string;
  monthFormatted: string;
  isWeekend: boolean;
  isFirstOfMonth: boolean;
}

export interface GanttTaskItem {
  task: Task;
  start: Date;
  end: Date;
  left: number;
  width: number;
  isSubtask: boolean;
  predecessors: Task[];
  dateRangeFormatted: string;
}

export interface UseGanttTimelineParams {
  tasks: Task[];
  dependencies?: TaskDependency[];
  locale?: string;
  dayWidth?: number;
}

export function toLocalDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function dayDifference(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function formatDay(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, { day: "2-digit" });
}

export function formatMonth(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, { month: "short" });
}

export function formatRange(start: Date, end: Date, locale?: string): string {
  return `${start.toLocaleDateString(locale, { day: "2-digit", month: "short" })} – ${end.toLocaleDateString(locale, { day: "2-digit", month: "short" })}`;
}

export function taskStart(task: Task): Date | undefined {
  const value = task.startDate || task.dueDate;
  return value ? toLocalDate(taskDateKey(value, task.allDay)) : undefined;
}

export function taskEnd(task: Task): Date | undefined {
  const value = task.dueDate || task.startDate;
  return value ? toLocalDate(taskDateKey(value, task.allDay)) : undefined;
}

export function getGanttBarColor(status: TaskStatus): string {
  return TASK_STATUS_COLORS[status]?.bar || "bg-slate-400";
}

export function useGanttTimeline({
  tasks,
  dependencies = [],
  locale,
  dayWidth = GANTT_DAY_WIDTH,
}: UseGanttTimelineParams) {
  const activeTasks = useMemo(
    () => tasks.filter((task) => !task.archived),
    [tasks],
  );

  const { datedTasksRaw, unscheduledTasks } = useMemo(() => {
    const dated: Array<{ task: Task; start: Date; end: Date }> = [];
    const unscheduled: Task[] = [];

    for (const task of activeTasks) {
      const start = taskStart(task);
      const end = taskEnd(task);
      if (start && end) {
        dated.push({ task, start, end });
      } else {
        unscheduled.push(task);
      }
    }

    return { datedTasksRaw: dated, unscheduledTasks: unscheduled };
  }, [activeTasks]);

  const predecessorsBySuccessor = useMemo(() => {
    const taskById = new Map(activeTasks.map((task) => [task.id, task]));
    const map = new Map<string, Task[]>();

    dependencies.forEach((dependency) => {
      const predecessor = taskById.get(dependency.predecessorTaskId);
      if (!predecessor) return;
      const list = map.get(dependency.successorTaskId) || [];
      list.push(predecessor);
      map.set(dependency.successorTaskId, list);
    });

    return map;
  }, [activeTasks, dependencies]);

  const range = useMemo(() => {
    if (datedTasksRaw.length === 0) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { start, end: addDays(start, 13) };
    }

    const starts = datedTasksRaw.map((item) => item.start);
    const ends = datedTasksRaw.map((item) => item.end);
    const start = addDays(
      new Date(Math.min(...starts.map((date) => date.getTime()))),
      -2,
    );
    const end = addDays(
      new Date(Math.max(...ends.map((date) => date.getTime()))),
      2,
    );
    return { start, end };
  }, [datedTasksRaw]);

  const days: GanttDayColumn[] = useMemo(() => {
    const count = dayDifference(range.start, range.end) + 1;
    return Array.from({ length: count }, (_, index) => {
      const date = addDays(range.start, index);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isFirstOfMonth = date.getDate() === 1 || index === 0;

      return {
        date,
        isoKey: date.toISOString(),
        dayNumberFormatted: formatDay(date, locale),
        monthFormatted: formatMonth(date, locale),
        isWeekend,
        isFirstOfMonth,
      };
    });
  }, [range, locale]);

  const todayOffset = useMemo(
    () => dayDifference(range.start, toLocalDate(dateKey(new Date()))),
    [range.start],
  );

  const timelineWidth = days.length * dayWidth;

  const datedGanttItems: GanttTaskItem[] = useMemo(() => {
    return datedTasksRaw.map(({ task, start, end }) => {
      const left =
        Math.max(0, dayDifference(range.start, start)) * dayWidth + 4;
      const width = Math.max(
        32,
        (dayDifference(start, end) + 1) * dayWidth - 8,
      );
      const isSubtask = Boolean(task.parentTaskId);
      const predecessors = predecessorsBySuccessor.get(task.id) || [];
      const dateRangeFormatted = formatRange(start, end, locale);

      return {
        task,
        start,
        end,
        left,
        width,
        isSubtask,
        predecessors,
        dateRangeFormatted,
      };
    });
  }, [datedTasksRaw, range.start, dayWidth, predecessorsBySuccessor, locale]);

  const rangeFormatted = useMemo(
    () => formatRange(range.start, range.end, locale),
    [range, locale],
  );

  return {
    range,
    rangeFormatted,
    days,
    datedTasks: datedGanttItems,
    unscheduledTasks,
    timelineWidth,
    todayOffset,
    dayWidth,
    labelWidth: GANTT_LABEL_WIDTH,
    getBarColor: getGanttBarColor,
  };
}
