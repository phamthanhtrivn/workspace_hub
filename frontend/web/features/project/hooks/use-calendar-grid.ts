"use client";

import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";
import { useCallback, useMemo, useState } from "react";
import type { Task } from "@/features/project/types/project";
import { taskDateKey } from "@/features/project/utils/task-dates";
import { formatInTimezone, getDisplayTimezone, zonedDateKey } from "@/lib/timezone";

export interface CalendarGridDay {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
}

export interface UseCalendarGridParams {
  tasks: Task[];
  locale?: string;
}

export interface UseCalendarGridReturn {
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  moveMonth: (amount: number) => void;
  goToToday: () => void;
  monthLabel: string;
  days: CalendarGridDay[];
  unscheduledTasks: Task[];
  formatTime: (value: string | undefined) => string;
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isTaskOnDate(task: Task, day: string, timeZone = getDisplayTimezone()): boolean {
  const start = taskDateKey(task.startDate || task.dueDate, task.allDay, timeZone);
  const end = taskDateKey(task.dueDate || task.startDate, task.allDay, timeZone);
  if (!start || !end) return false;
  return start <= day && day <= end;
}

export function getInitialMonth(tasks: Task[]): Date {
  const firstDatedTask = tasks.find((task) => task.startDate || task.dueDate);
  const value = firstDatedTask?.startDate || firstDatedTask?.dueDate;
  return value
    ? new Date(`${taskDateKey(value, firstDatedTask?.allDay)}T00:00:00`)
    : new Date(`${zonedDateKey()}T00:00:00`);
}

export function useCalendarGrid({
  tasks,
  locale,
}: UseCalendarGridParams): UseCalendarGridReturn {
  const accountTimezone = useAccountTimezone();
  const [currentMonth, setCurrentMonth] = useState(() =>
    getInitialMonth(tasks),
  );

  const moveMonth = useCallback((amount: number) => {
    setCurrentMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  }, []);

  const goToToday = useCallback(() => {
    setCurrentMonth(new Date(`${zonedDateKey(new Date(), accountTimezone)}T00:00:00`));
  }, [accountTimezone]);

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth, locale]);

  const activeTasks = useMemo(() => tasks.filter((t) => !t.deletedAt), [tasks]);

  const unscheduledTasks = useMemo(
    () => activeTasks.filter((task) => !task.startDate && !task.dueDate),
    [activeTasks],
  );

  const days = useMemo(() => {
    const firstDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const lastDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
    );
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    const totalDays = mondayOffset + daysInMonth;
    const totalWeeks = Math.ceil(totalDays / 7);
    const totalGridDays = totalWeeks * 7;
    const todayKey = zonedDateKey(new Date(), accountTimezone);

    return Array.from({ length: totalGridDays }, (_, index) => {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        index - mondayOffset + 1,
      );
      const key = dateKey(date);
      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
      const dayTasks = isCurrentMonth
        ? activeTasks.filter((task) => isTaskOnDate(task, key, accountTimezone))
        : [];

      return {
        date,
        key,
        isCurrentMonth,
        isToday: isCurrentMonth && key === todayKey,
        tasks: dayTasks,
      };
    });
  }, [currentMonth, activeTasks, accountTimezone]);

  const formatTaskTime = useCallback(
    (value: string | undefined) => {
      if (!value || value.length < 16) return "";
      return formatInTimezone(value, locale, {
        hour: "2-digit",
        minute: "2-digit",
      }, accountTimezone);
    },
    [locale, accountTimezone],
  );

  return {
    currentMonth,
    setCurrentMonth,
    moveMonth,
    goToToday,
    monthLabel,
    days,
    unscheduledTasks,
    formatTime: formatTaskTime,
  };
}
