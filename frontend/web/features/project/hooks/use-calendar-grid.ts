"use client";

import { useCallback, useMemo, useState } from "react";
import type { Task } from "@/features/project/types/project";
import { taskDateKey } from "@/features/project/utils/task-dates";

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

export function isTaskOnDate(task: Task, day: string): boolean {
  const start = taskDateKey(task.startDate || task.dueDate, task.allDay);
  const end = taskDateKey(task.dueDate || task.startDate, task.allDay);
  if (!start || !end) return false;
  return start <= day && day <= end;
}

export function getInitialMonth(tasks: Task[]): Date {
  const firstDatedTask = tasks.find((task) => task.startDate || task.dueDate);
  const value = firstDatedTask?.startDate || firstDatedTask?.dueDate;
  return value
    ? new Date(`${taskDateKey(value, firstDatedTask?.allDay)}T00:00:00`)
    : new Date();
}

export function useCalendarGrid({
  tasks,
  locale = "vi-VN",
}: UseCalendarGridParams): UseCalendarGridReturn {
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
    setCurrentMonth(new Date());
  }, []);

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth, locale]);

  const activeTasks = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);

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
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const todayKey = dateKey(new Date());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        index - mondayOffset + 1,
      );
      const key = dateKey(date);
      const dayTasks = activeTasks.filter((task) => isTaskOnDate(task, key));

      return {
        date,
        key,
        isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
        isToday: key === todayKey,
        tasks: dayTasks,
      };
    });
  }, [currentMonth, activeTasks]);

  const formatTaskTime = useCallback(
    (value: string | undefined) => {
      if (!value || value.length < 16) return "";
      return new Date(value).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    [locale],
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

