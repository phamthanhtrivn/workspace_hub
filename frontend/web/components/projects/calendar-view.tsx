"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { type Task } from "@/types/project";
import { TaskPriorityBadge } from "./status-badge";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function valueDateKey(value?: string): string | undefined {
  return value?.slice(0, 10);
}

function formatTime(value?: string): string {
  if (!value || value.length < 16) return "Cả ngày";
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isTaskOnDate(task: Task, day: string): boolean {
  const start = valueDateKey(task.startDate || task.dueDate);
  const end = valueDateKey(task.dueDate || task.startDate);
  if (!start || !end) return false;
  return start <= day && day <= end;
}

function getInitialMonth(tasks: Task[]): Date {
  const firstDatedTask = tasks.find((task) => task.startDate || task.dueDate);
  const value = firstDatedTask?.startDate || firstDatedTask?.dueDate;
  return value ? new Date(`${value.slice(0, 10)}T00:00:00`) : new Date();
}

export default function CalendarView({
  tasks,
  onTaskClick,
  onCreateDate,
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onCreateDate?: (date: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => getInitialMonth(tasks));

  const days = useMemo(() => {
    const firstDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const mondayOffset = (firstDay.getDay() + 6) % 7;

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        index - mondayOffset + 1,
      );
      return {
        date,
        key: dateKey(date),
        isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
        isToday: dateKey(date) === dateKey(new Date()),
      };
    });
  }, [currentMonth]);

  const monthLabel = currentMonth.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  const moveMonth = (amount: number) => {
    setCurrentMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black capitalize text-[var(--color-primary-dark)]">
            {monthLabel}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            Bấm vào task để xem chi tiết hoặc bấm dấu + để tạo task.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="border-r border-slate-100 px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 last:border-r-0"
          >
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map(({ date, key, isCurrentMonth, isToday }) => {
          const dayTasks = tasks.filter(
            (task) => !task.archived && isTaskOnDate(task, key),
          );

          return (
            <div
              key={key}
              className={`group min-h-32 border-b border-r border-slate-100 p-2 last:border-r-0 sm:min-h-36 ${
                isCurrentMonth ? "bg-white" : "bg-slate-50/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                    isToday
                      ? "bg-[var(--color-primary-dark)] text-white"
                      : isCurrentMonth
                        ? "text-slate-600"
                        : "text-slate-300"
                  }`}
                >
                  {date.getDate()}
                </span>
                {onCreateDate && (
                  <button
                    type="button"
                    onClick={() => onCreateDate(key)}
                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                    aria-label={`Tạo task ngày ${key}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="mt-2 space-y-1.5">
                {dayTasks.slice(0, 4).map((task) => (
                  <button
                    key={`${key}-${task.id}`}
                    type="button"
                    onClick={() => onTaskClick?.(task)}
                    className="w-full rounded-lg border border-slate-200/80 bg-white px-2 py-1.5 text-left shadow-sm transition hover:border-[var(--color-secondary)] hover:shadow-md"
                  >
                    <p className="truncate text-[11px] font-bold text-[var(--color-primary-dark)]">
                      {task.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <TaskPriorityBadge priority={task.priority} />
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-400">
                        <Clock className="h-2.5 w-2.5" />
                        {task.allDay ? "Cả ngày" : formatTime(task.startDate || task.dueDate)}
                      </span>
                    </div>
                  </button>
                ))}
                {dayTasks.length > 4 && (
                  <p className="px-1 text-[10px] font-bold text-slate-400">
                    +{dayTasks.length - 4} task khác
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
