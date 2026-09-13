"use client";

import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { TaskStatus, type Task } from "@/features/project/types/project";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useCalendarGrid } from "@/features/project/hooks/use-calendar-grid";
import { taskDateKey } from "@/features/project/utils/task-dates";

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
  { labelId: string; card: string }
> = {
  [TaskStatus.TODO]: {
    labelId: "project.task.status.todo",
    card: "border-slate-600 bg-slate-500 hover:bg-slate-600 text-white",
  },
  [TaskStatus.IN_PROGRESS]: {
    labelId: "project.task.status.inProgress",
    card: "border-[#0747A6] bg-[#0052CC] hover:bg-[#0747A6] text-white",
  },
  [TaskStatus.IN_REVIEW]: {
    labelId: "project.task.status.inReview",
    card: "border-amber-600 bg-amber-500 hover:bg-amber-600 text-white",
  },
  [TaskStatus.DONE]: {
    labelId: "project.task.status.done",
    card: "border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  [TaskStatus.CANCELLED]: {
    labelId: "project.task.status.cancelled",
    card: "border-slate-500 bg-slate-400 hover:bg-slate-500 text-white",
  },
};

interface CalendarTaskSegment {
  task: Task;
  startColumn: number;
  span: number;
  lane: number;
  showTitle: boolean;
}

export function buildWeekTaskSegments(
  weekDays: Array<{ key: string; tasks: Task[] }>,
): CalendarTaskSegment[] {
  if (weekDays.length === 0) return [];
  const weekStart = weekDays[0].key;
  const weekEnd = weekDays[weekDays.length - 1].key;
  const uniqueTasks = new Map<string, Task>();
  weekDays.forEach((day) =>
    day.tasks.forEach((task) => uniqueTasks.set(task.id, task)),
  );

  const candidates = [...uniqueTasks.values()]
    .map((task) => {
      const taskStart = taskDateKey(
        task.startDate || task.dueDate,
        task.allDay,
      );
      const taskEnd = taskDateKey(task.dueDate || task.startDate, task.allDay);
      const segmentStart = taskStart < weekStart ? weekStart : taskStart;
      const segmentEnd = taskEnd > weekEnd ? weekEnd : taskEnd;
      return {
        task,
        taskStart,
        startColumn: weekDays.findIndex((day) => day.key === segmentStart),
        endColumn: weekDays.findIndex((day) => day.key === segmentEnd),
      };
    })
    .filter(
      (segment) =>
        segment.startColumn >= 0 && segment.endColumn >= segment.startColumn,
    )
    .sort((a, b) => a.startColumn - b.startColumn || b.endColumn - a.endColumn);

  const occupiedThrough: number[] = [];
  return candidates.map((segment) => {
    let lane = occupiedThrough.findIndex(
      (endColumn) => endColumn < segment.startColumn,
    );
    if (lane < 0) lane = occupiedThrough.length;
    occupiedThrough[lane] = segment.endColumn;
    return {
      task: segment.task,
      startColumn: segment.startColumn,
      span: segment.endColumn - segment.startColumn + 1,
      lane,
      showTitle: segment.taskStart === weekDays[segment.startColumn].key,
    };
  });
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
      <div className="relative flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-center">
        <div className="sm:absolute sm:left-4">
          <p className="text-xs font-semibold text-slate-400">
            {intl.formatMessage({ id: "project.calendar.helper" })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
            aria-label={intl.formatMessage({
              id: "project.calendar.previousMonth",
            })}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <h2 className="min-w-36 text-center text-base font-black capitalize text-[var(--color-primary-dark)] sm:text-lg">
            {monthLabel}
          </h2>

          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
            aria-label={intl.formatMessage({
              id: "project.calendar.nextMonth",
            })}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={goToToday}
            className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-xs transition hover:bg-slate-50"
          >
            {intl.formatMessage({ id: "project.calendar.today" })}
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

      <div>
        {Array.from({ length: 6 }, (_, weekIndex) => {
          const weekDays = days.slice(weekIndex * 7, weekIndex * 7 + 7);
          const segments = buildWeekTaskSegments(weekDays);
          const visibleSegments = segments.filter(
            (segment) => segment.lane < 4,
          );
          return (
            <div
              key={weekDays[0].key}
              className="relative grid min-h-40 grid-cols-7 border-b border-slate-100 sm:min-h-44"
            >
              {weekDays.map(
                ({ date, key, isCurrentMonth, isToday, tasks: dayTasks }) => (
                  <div
                    key={key}
                    className={`group relative border-r border-slate-100 p-2 last:border-r-0 ${isCurrentMonth ? "bg-white" : "bg-slate-50/60"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${isToday ? "bg-[var(--color-primary-dark)] text-white" : isCurrentMonth ? "text-slate-600" : "text-slate-300"}`}
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
                    {dayTasks.length > 4 && (
                      <p className="absolute bottom-2 left-2 text-[10px] font-bold text-slate-400">
                        {intl.formatMessage(
                          { id: "project.calendar.moreTasks" },
                          { count: dayTasks.length - 4 },
                        )}
                      </p>
                    )}
                  </div>
                ),
              )}
              <div className="pointer-events-none absolute inset-x-0 top-11 grid grid-cols-7 auto-rows-[42px] gap-y-1">
                {visibleSegments.map(
                  ({ task, startColumn, span, lane, showTitle }) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onTaskClick?.(task)}
                      style={{
                        gridColumn: `${startColumn + 1} / span ${span}`,
                        gridRow: lane + 1,
                      }}
                      className={`pointer-events-auto mx-1.5 flex min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left shadow-xs transition-all hover:brightness-95 hover:shadow-md ${statusColors[task.status].card}`}
                    >
                      {showTitle && (
                        <span className="truncate text-[11px] font-bold text-white">
                          {task.title}
                        </span>
                      )}
                      {showTitle && !task.allDay && (
                        <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-[9px] font-semibold text-white/90">
                          <Clock className="h-2.5 w-2.5 text-white/90" />
                          {formatTime(task.startDate || task.dueDate)}
                        </span>
                      )}
                    </button>
                  ),
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
