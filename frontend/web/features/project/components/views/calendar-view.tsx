"use client";

import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { TaskStatus, type Task } from "@/features/project/types/project";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useCalendarGrid } from "@/features/project/hooks/use-calendar-grid";

const WEEKDAY_IDS = [
  "project.calendar.weekday.mon",
  "project.calendar.weekday.tue",
  "project.calendar.weekday.wed",
  "project.calendar.weekday.thu",
  "project.calendar.weekday.fri",
  "project.calendar.weekday.sat",
  "project.calendar.weekday.sun",
];

const statusColors: Record<
  TaskStatus,
  { labelId: string; card: string; dot: string }
> = {
  [TaskStatus.TODO]: {
    labelId: "project.task.status.todo",
    card: "border-slate-200 bg-white",
    dot: "bg-slate-400",
  },
  [TaskStatus.IN_PROGRESS]: {
    labelId: "project.task.status.inProgress",
    card: "border-blue-200 bg-blue-50/60",
    dot: "bg-blue-500",
  },
  [TaskStatus.IN_REVIEW]: {
    labelId: "project.task.status.inReview",
    card: "border-amber-200 bg-amber-50/70",
    dot: "bg-amber-500",
  },
  [TaskStatus.DONE]: {
    labelId: "project.task.status.done",
    card: "border-emerald-200 bg-emerald-50/70",
    dot: "bg-emerald-500",
  },
  [TaskStatus.CANCELLED]: {
    labelId: "project.task.status.cancelled",
    card: "border-slate-300 bg-slate-100/80",
    dot: "bg-slate-500",
  },
};

export default function CalendarView({
  tasks,
  onTaskClick,
  onCreateDate,
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onCreateDate?: (date: string) => void;
}) {
  const intl = useAppIntl();
  const {
    moveMonth,
    goToToday,
    monthLabel,
    days,
    unscheduledTasks,
    formatTime,
  } = useCalendarGrid({ tasks, locale: intl.locale });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black capitalize text-[var(--color-primary-dark)]">
            {monthLabel}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            {intl.formatMessage({ id: "project.calendar.helper" })}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {Object.values(statusColors).map((status) => (
            <span
              key={status.labelId}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500"
            >
              <span className={`h-2 w-2 rounded-full ${status.dot}`} />
              {intl.formatMessage({ id: status.labelId })}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            {intl.formatMessage({ id: "project.calendar.today" })}
          </button>
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label={intl.formatMessage({
              id: "project.calendar.previousMonth",
            })}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label={intl.formatMessage({
              id: "project.calendar.nextMonth",
            })}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
        {WEEKDAY_IDS.map((weekdayId) => (
          <div
            key={weekdayId}
            className="border-r border-slate-100 px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 last:border-r-0"
          >
            {intl.formatMessage({ id: weekdayId })}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map(({ date, key, isCurrentMonth, isToday, tasks: dayTasks }) => {
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
                    aria-label={intl.formatMessage(
                      { id: "project.calendar.createTaskForDate" },
                      { date: key },
                    )}
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
                    className={`w-full rounded-lg border px-2 py-1.5 text-left shadow-sm transition hover:border-[var(--color-secondary)] hover:shadow-md ${statusColors[task.status].card}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${statusColors[task.status].dot}`}
                      />
                      <p className="truncate text-[11px] font-bold text-[var(--color-primary-dark)]">
                        {task.title}
                      </p>
                    </div>
                    <div className="mt-1 flex justify-end">
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-400">
                        <Clock className="h-2.5 w-2.5" />
                        {task.allDay
                          ? intl.formatMessage({ id: "project.task.allDay" })
                          : formatTime(task.startDate || task.dueDate)}
                      </span>
                    </div>
                  </button>
                ))}
                {dayTasks.length > 4 && (
                  <p className="px-1 text-[10px] font-bold text-slate-400">
                    {intl.formatMessage(
                      { id: "project.calendar.moreTasks" },
                      { count: dayTasks.length - 4 },
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unscheduledTasks.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
          <div>
            <h3 className="text-sm font-black text-[var(--color-primary-dark)]">
              {intl.formatMessage(
                { id: "project.calendar.unscheduledCount" },
                { count: unscheduledTasks.length },
              )}
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {intl.formatMessage({ id: "project.calendar.unscheduledHelp" })}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {unscheduledTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onTaskClick?.(task)}
                className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-[var(--color-secondary)] hover:shadow-md"
              >
                <span className="max-w-56 truncate text-xs font-bold text-[var(--color-primary-dark)]">
                  {task.title}
                </span>
                <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                  {intl.formatMessage({
                    id: task.parentTaskId
                      ? "project.task.subtask"
                      : "project.task.task",
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
