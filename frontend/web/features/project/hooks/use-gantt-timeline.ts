"use client";

import { useMemo, useState } from "react";
import {
  type Task,
  TaskStatus,
  type TaskDependency,
} from "@/features/project/types/project";
import { taskDateKey } from "@/features/project/utils/task-dates";

export type GanttZoomMode = "day" | "week" | "month";

export const GANTT_ZOOM_CONFIG: Record<
  GanttZoomMode,
  {
    dayWidth: number;
    spanDays: number;
    shiftDays: number;
    weekWidth: number;
    monthWidth: number;
  }
> = {
  day: {
    dayWidth: 100,
    spanDays: 14,
    shiftDays: 7,
    weekWidth: 700,
    monthWidth: 700,
  },
  week: {
    dayWidth: 32,
    spanDays: 28,
    shiftDays: 7,
    weekWidth: 224,
    monthWidth: 896,
  },
  month: {
    dayWidth: 3.15,
    spanDays: 365,
    shiftDays: 365,
    weekWidth: 22,
    monthWidth: 96,
  },
};

export const GANTT_DAY_WIDTH = GANTT_ZOOM_CONFIG.day.dayWidth;
export const GANTT_LABEL_WIDTH = 280;

export interface GanttMonthColumn {
  isoKey: string;
  monthIndex: number;
  monthNumber: number;
  monthFormatted: string;
  year: number;
  startDate: Date;
  endDate: Date;
  isCurrentMonth: boolean;
}

export interface GanttWeekColumn {
  isoKey: string;
  weekIndex: number;
  weekNumberFormatted: string;
  dateRangeFormatted: string;
  startDate: Date;
  endDate: Date;
  isCurrentWeek: boolean;
}

export interface GanttDayColumn {
  date: Date;
  isoKey: string;
  dayNumberFormatted: string;
  dayOfWeekFormatted: string;
  monthFormatted: string;
  isWeekend: boolean;
  isFirstOfMonth: boolean;
  isToday: boolean;
}

export interface GanttTaskItem {
  task: Task;
  start: Date;
  end: Date;
  left: number;
  width: number;
  durationDays: number;
  isSubtask: boolean;
  predecessors: Task[];
  dateRangeFormatted: string;
}

export interface UseGanttTimelineParams {
  tasks: Task[];
  dependencies?: TaskDependency[];
  dayWidth?: number;
  initialZoom?: GanttZoomMode;
  containerWidth?: number;
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

export function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", { day: "2-digit" });
}

export function formatWeekday(date: Date): string {
  const enDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return enDays[date.getDay()];
}

export function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short" });
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function formatRange(start: Date, end: Date): string {
  return `${start.toLocaleDateString("en-US", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}`;
}

export function formatWeekRange(startDate: Date, endDate: Date): string {
  return `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`;
}

export function formatWeekNumber(index: number): string {
  return `Week ${index}`;
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
  switch (status) {
    case TaskStatus.TODO:
      return "bg-slate-500 hover:bg-slate-600 border-slate-600 text-white";
    case TaskStatus.IN_PROGRESS:
      return "bg-[#0052CC] hover:bg-[#0747A6] border-[#0747A6] text-white";
    case TaskStatus.IN_REVIEW:
      return "bg-amber-500 hover:bg-amber-600 border-amber-600 text-white";
    case TaskStatus.DONE:
      return "bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white";
    case TaskStatus.CANCELLED:
      return "bg-red-500 hover:bg-red-600 border-red-600 text-white";
    default:
      return "bg-slate-500 text-white";
  }
}

export function useGanttTimeline({
  tasks,
  dependencies = [],
  dayWidth: explicitDayWidth,
  initialZoom = "day",
  containerWidth,
}: UseGanttTimelineParams) {
  const [zoomMode, setZoomMode] = useState<GanttZoomMode>(initialZoom);
  const [offsetDays, setOffsetDays] = useState<number>(0);

  const availableWidth = containerWidth
    ? Math.max(0, containerWidth - GANTT_LABEL_WIDTH)
    : 0;

  const dayWidth = explicitDayWidth
    ? explicitDayWidth
    : zoomMode === "day"
      ? availableWidth > 0
        ? Math.max(72, availableWidth / 14)
        : GANTT_ZOOM_CONFIG.day.dayWidth
      : zoomMode === "week"
        ? availableWidth > 0
          ? Math.max(200, availableWidth / 4) / 7
          : GANTT_ZOOM_CONFIG.week.dayWidth
        : GANTT_ZOOM_CONFIG.month.dayWidth;

  const weekWidth = explicitDayWidth
    ? explicitDayWidth * 7
    : zoomMode === "week"
      ? availableWidth > 0
        ? Math.max(200, availableWidth / 4)
        : GANTT_ZOOM_CONFIG.week.weekWidth
      : GANTT_ZOOM_CONFIG[zoomMode].weekWidth;

  const monthWidth =
    zoomMode === "month"
      ? availableWidth > 0
        ? Math.max(75, availableWidth / 12)
        : GANTT_ZOOM_CONFIG.month.monthWidth
      : GANTT_ZOOM_CONFIG[zoomMode].monthWidth;

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

  // Determine anchor date: prefer todayDate when tasks are within +/- 30 days of today
  const todayDate = useMemo(() => toLocalDate(dateKey(new Date())), []);

  const anchorDate = useMemo(() => {
    if (datedTasksRaw.length === 0) return todayDate;

    const minStart = Math.min(...datedTasksRaw.map((t) => t.start.getTime()));
    const maxEnd = Math.max(...datedTasksRaw.map((t) => t.end.getTime()));

    // Anchor around today if today is within active project horizon
    if (
      todayDate.getTime() >= minStart - 30 * 86_400_000 &&
      todayDate.getTime() <= maxEnd + 30 * 86_400_000
    ) {
      return todayDate;
    }

    return new Date(minStart);
  }, [datedTasksRaw, todayDate]);

  // Compute adaptive range based on zoomMode
  const range = useMemo(() => {
    const targetAnchor = addDays(anchorDate, offsetDays);

    if (zoomMode === "month") {
      // Full 12 calendar months of targetAnchor year
      const year = targetAnchor.getFullYear();
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return { start, end };
    }

    // Day or Week mode: Aligned to week Mondays
    const dayOfWeek = (targetAnchor.getDay() + 6) % 7; // Monday = 0
    const weekMonday = addDays(targetAnchor, -dayOfWeek);

    if (zoomMode === "day") {
      // 14 days (2 full weeks: Monday through Sunday of target anchor week + next week)
      const start = weekMonday;
      const end = addDays(weekMonday, 13);
      return { start, end };
    }

    // Week mode: 28 days (4 full weeks: starts from weekMonday of targetAnchor)
    const start = weekMonday;
    const end = addDays(weekMonday, 27);
    return { start, end };
  }, [anchorDate, offsetDays, zoomMode]);

  const days: GanttDayColumn[] = useMemo(() => {
    if (zoomMode === "month") return [];
    const count = dayDifference(range.start, range.end) + 1;
    return Array.from({ length: count }, (_, index) => {
      const date = addDays(range.start, index);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isFirstOfMonth = date.getDate() === 1 || index === 0;
      const isToday = dateKey(date) === dateKey(todayDate);

      return {
        date,
        isoKey: date.toISOString(),
        dayNumberFormatted: formatDay(date),
        dayOfWeekFormatted: formatWeekday(date),
        monthFormatted: formatMonth(date),
        isWeekend,
        isFirstOfMonth,
        isToday,
      };
    });
  }, [range, todayDate, zoomMode]);

  const weeks: GanttWeekColumn[] = useMemo(() => {
    if (zoomMode !== "week") return [];

    const weekCount = Math.floor(days.length / 7);
    return Array.from({ length: weekCount }, (_, index) => {
      const startDate = addDays(range.start, index * 7);
      const endDate = addDays(startDate, 6);
      const isCurrentWeek =
        todayDate.getTime() >= startDate.getTime() &&
        todayDate.getTime() <= endDate.getTime();

      return {
        isoKey: `week-${dateKey(startDate)}`,
        weekIndex: index + 1,
        weekNumberFormatted: formatWeekNumber(index + 1),
        dateRangeFormatted: formatWeekRange(startDate, endDate),
        startDate,
        endDate,
        isCurrentWeek,
      };
    });
  }, [zoomMode, days.length, range.start, todayDate]);

  const months: GanttMonthColumn[] = useMemo(() => {
    if (zoomMode !== "month") return [];
    const year = range.start.getFullYear();
    return Array.from({ length: 12 }, (_, index) => {
      const startDate = new Date(year, index, 1);
      const endDate = new Date(year, index + 1, 0);
      const isCurrentMonth =
        todayDate.getFullYear() === year && todayDate.getMonth() === index;

      const monthFormatted = startDate.toLocaleDateString("en-US", { month: "short" });

      return {
        isoKey: `month-${year}-${index + 1}`,
        monthIndex: index,
        monthNumber: index + 1,
        monthFormatted,
        year,
        startDate,
        endDate,
        isCurrentMonth,
      };
    });
  }, [zoomMode, range.start, todayDate]);

  const currentMonthFormatted = useMemo(() => {
    if (zoomMode === "month") {
      const year = range.start.getFullYear();
      return `Year ${year}`;
    }
    const midDate = days[Math.floor(days.length / 2)]?.date || anchorDate;
    return formatMonthYear(midDate);
  }, [zoomMode, range.start, days, anchorDate]);

  const timelineWidth = useMemo(() => {
    if (zoomMode === "month") {
      return Math.max(availableWidth, 12 * monthWidth);
    }
    if (zoomMode === "week") {
      return Math.max(availableWidth, weeks.length * weekWidth);
    }
    return Math.max(availableWidth, days.length * dayWidth);
  }, [
    zoomMode,
    availableWidth,
    monthWidth,
    weeks.length,
    weekWidth,
    days.length,
    dayWidth,
  ]);

  const todayOffset = useMemo(
    () => dayDifference(range.start, todayDate),
    [range.start, todayDate],
  );

  const hasToday = useMemo(() => {
    if (zoomMode === "month") {
      return todayDate.getFullYear() === range.start.getFullYear();
    }
    return todayOffset >= 0 && todayOffset < days.length;
  }, [zoomMode, todayDate, range.start, todayOffset, days.length]);

  const todayLeft = useMemo(() => {
    if (!hasToday) return 0;
    if (zoomMode === "month") {
      const baseYear = range.start.getFullYear();
      const monthDiff = todayDate.getMonth();
      const daysInMonth = new Date(baseYear, monthDiff + 1, 0).getDate();
      const fraction = (todayDate.getDate() - 0.5) / daysInMonth;
      return (monthDiff + fraction) * monthWidth;
    }
    return todayOffset * dayWidth + dayWidth / 2;
  }, [
    hasToday,
    zoomMode,
    todayDate,
    range.start,
    monthWidth,
    todayOffset,
    dayWidth,
  ]);

  const datedGanttItems: GanttTaskItem[] = useMemo(() => {
    const baseYear = range.start.getFullYear();

    return datedTasksRaw.map(({ task, start, end }) => {
      let left: number;
      let width: number;

      if (zoomMode === "month") {
        const startMonthDiff =
          (start.getFullYear() - baseYear) * 12 + start.getMonth();
        const startDaysInMonth = new Date(
          start.getFullYear(),
          start.getMonth() + 1,
          0,
        ).getDate();
        const startFraction = Math.max(
          0,
          Math.min(1, (start.getDate() - 1) / startDaysInMonth),
        );
        left = Math.max(0, (startMonthDiff + startFraction) * monthWidth) + 4;

        const endMonthDiff =
          (end.getFullYear() - baseYear) * 12 + end.getMonth();
        const endDaysInMonth = new Date(
          end.getFullYear(),
          end.getMonth() + 1,
          0,
        ).getDate();
        const endFraction = Math.max(
          0,
          Math.min(1, end.getDate() / endDaysInMonth),
        );
        const right = (endMonthDiff + endFraction) * monthWidth;

        width = Math.max(28, right - left - 4);
      } else {
        const offsetDays = dayDifference(range.start, start);
        left = Math.max(0, offsetDays) * dayWidth + 4;
        const durationDays = Math.max(1, dayDifference(start, end) + 1);

        if (offsetDays < 0) {
          const visibleDays = Math.max(1, dayDifference(range.start, end) + 1);
          width = Math.max(28, visibleDays * dayWidth - 8);
        } else {
          width = Math.max(28, durationDays * dayWidth - 8);
        }
      }

      const durationDays = Math.max(1, dayDifference(start, end) + 1);
      const isSubtask = Boolean(task.parentTaskId);
      const predecessors = predecessorsBySuccessor.get(task.id) || [];
      const dateRangeFormatted = formatRange(start, end);

      return {
        task,
        start,
        end,
        left,
        width,
        durationDays,
        isSubtask,
        predecessors,
        dateRangeFormatted,
      };
    });
  }, [
    datedTasksRaw,
    range.start,
    dayWidth,
    monthWidth,
    zoomMode,
    predecessorsBySuccessor,
  ]);

  const rangeFormatted = useMemo(
    () => formatRange(range.start, range.end),
    [range],
  );

  const navigate = (direction: -1 | 1) => {
    const shift = GANTT_ZOOM_CONFIG[zoomMode].shiftDays;
    setOffsetDays((prev) => prev + direction * shift);
  };

  const jumpToToday = () => {
    setOffsetDays(0);
  };

  return {
    range,
    rangeFormatted,
    currentMonthFormatted,
    days,
    weeks,
    months,
    datedTasks: datedGanttItems,
    unscheduledTasks,
    timelineWidth,
    todayOffset,
    todayLeft,
    dayWidth,
    weekWidth,
    monthWidth,
    labelWidth: GANTT_LABEL_WIDTH,
    getBarColor: getGanttBarColor,
    zoomMode,
    setZoomMode,
    navigate,
    jumpToToday,
    hasToday,
  };
}
