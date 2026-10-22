"use client";

import { useMemo, useState } from "react";
import {
  type Task,
  TaskStatus,
  type TaskDependency,
} from "@/features/project/types/project";
import type { GanttBarGeometry, GanttZoomMode } from "../types/gantt";
import { GANTT_LABEL_WIDTH, GANTT_MIN_LABEL_WIDTH, GANTT_LABEL_WIDTH_RATIO, GANTT_ZOOM_CONFIG } from "../constants/gantt.constants";
import { addDays, dateKey, dayDifference, taskStart, taskEnd, toLocalDate, getInitialGanttAnchor, getGanttRange, getGanttDatePosition, getGanttBarGeometry, navigateGanttAnchor } from "../utils/gantt-timeline.utils";

export type { GanttZoomMode } from "../types/gantt";
export { GANTT_ZOOM_CONFIG, GANTT_LABEL_WIDTH } from "../constants/gantt.constants";
export { addDays, dateKey, dayDifference, taskStart, taskEnd, toLocalDate } from "../utils/gantt-timeline.utils";

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

export interface GanttTaskItem extends GanttBarGeometry {
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
  const startLabel = start.toLocaleDateString("en-US", {
    day: "2-digit", month: "short", ...(start.getFullYear() !== end.getFullYear() ? { year: "numeric" } : {}),
  });
  return `${startLabel} ? ${end.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}`;
}

export function formatWeekRange(startDate: Date, endDate: Date): string {
  return `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`;
}

export function formatWeekNumber(index: number): string {
  return `Week ${index}`;
}

export function getGanttBarColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.TODO:
      return "bg-muted hover:bg-accent border-input text-muted-foreground";
    case TaskStatus.IN_PROGRESS:
      return "bg-primary-soft hover:bg-primary-soft border-info-outline text-primary-soft-foreground";
    case TaskStatus.IN_REVIEW:
      return "bg-warning-soft hover:bg-warning-soft border-warning-outline text-warning-content";
    case TaskStatus.DONE:
      return "bg-success-soft hover:bg-success-soft border-success-outline text-success-content";
    case TaskStatus.CANCELLED:
      return "bg-destructive-soft hover:bg-destructive-soft border-destructive-outline text-destructive-content";
    default:
      return "bg-muted text-muted-foreground";
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
  const [anchorDate, setAnchorDate] = useState(() =>
    getInitialGanttAnchor(tasks, toLocalDate(dateKey(new Date()))),
  );

  const labelWidth = containerWidth
    ? Math.min(
        GANTT_LABEL_WIDTH,
        Math.max(GANTT_MIN_LABEL_WIDTH, Math.floor(containerWidth * GANTT_LABEL_WIDTH_RATIO)),
      )
    : GANTT_LABEL_WIDTH;
  const availableWidth = containerWidth
    ? Math.max(0, containerWidth - labelWidth)
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
      if (start && end && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
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

  const todayKey = dateKey(new Date());
  const todayDate = useMemo(() => toLocalDate(todayKey), [todayKey]);
  const range = useMemo(() => getGanttRange(anchorDate, zoomMode), [anchorDate, zoomMode]);

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

  const scale = useMemo(() => ({ range, zoomMode, dayWidth, monthWidth }), [range, zoomMode, dayWidth, monthWidth]);
  const todayLeft = hasToday ? getGanttDatePosition(todayDate, scale, 0.5) : 0;

  const datedGanttItems: GanttTaskItem[] = useMemo(() =>
    datedTasksRaw.map(({ task, start, end }) => ({
      task, start, end,
      ...getGanttBarGeometry(start, end, scale),
      durationDays: Math.max(1, dayDifference(start, end) + 1),
      isSubtask: Boolean(task.parentTaskId),
      predecessors: predecessorsBySuccessor.get(task.id) || [],
      dateRangeFormatted: formatRange(start, end),
    })), [datedTasksRaw, scale, predecessorsBySuccessor]);

  const rangeFormatted = useMemo(
    () => formatRange(range.start, range.end),
    [range],
  );

  const navigate = (direction: -1 | 1) => {
    setAnchorDate((current) => navigateGanttAnchor(current, zoomMode, direction));
  };

  const jumpToToday = () => setAnchorDate(toLocalDate(dateKey(new Date())));
  const jumpToTask = (task: Task) => {
    const start = taskStart(task);
    if (start && Number.isFinite(start.getTime())) setAnchorDate(new Date(start));
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
    labelWidth,
    getBarColor: getGanttBarColor,
    zoomMode,
    setZoomMode,
    navigate,
    jumpToToday,
    jumpToTask,
    anchorDate,
    hasToday,
  };
}
