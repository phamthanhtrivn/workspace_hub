"use client";

import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  FolderKanban,
  Repeat,
} from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEvent } from "../../types/calendar.types";
import {
  formatTaskDueDate,
  groupCalendarTasks,
} from "../../utils/calendar-tasks.utils";
import { cleanTaskDescription } from "../../utils/calendar-event.utils";

interface CalendarTaskListProps {
  tasks: CalendarEvent[];
  color: string;
  readOnly: boolean;
  showCompleted: boolean;
  onToggleTask: (task: CalendarEvent) => void;
  onSelectTask: (task: CalendarEvent) => void;
}

export function CalendarTaskList({
  tasks,
  color,
  readOnly,
  showCompleted,
  onToggleTask,
  onSelectTask,
}: CalendarTaskListProps) {
  const intl = useAppIntl();
  const [completedOpen, setCompletedOpen] = useState(false);
  const grouped = useMemo(() => groupCalendarTasks(tasks), [tasks]);
  const pendingCount =
    grouped.overdue.length + grouped.today.length + grouped.upcoming.length;

  const renderTask = (task: CalendarEvent, isOverdue = false) => (
    <TaskRowItem
      key={task.id}
      task={task}
      color={color}
      locale={intl.locale}
      isOverdue={isOverdue}
      readOnly={readOnly}
      onToggle={readOnly ? undefined : () => onToggleTask(task)}
      onSelect={() => onSelectTask(task)}
    />
  );

  return (
    <div className="space-y-4">
      {grouped.overdue.length > 0 && (
        <TaskSection
          title={intl.formatMessage({ id: "calendar.tasks.overdue" })}
          count={grouped.overdue.length}
          tone="danger"
        >
          {grouped.overdue.map((task) => renderTask(task, true))}
        </TaskSection>
      )}

      {grouped.today.length > 0 && (
        <TaskSection
          title={intl.formatMessage({ id: "calendar.tasks.today" })}
          count={grouped.today.length}
          tone="primary"
        >
          {grouped.today.map((task) => renderTask(task))}
        </TaskSection>
      )}

      {grouped.upcoming.length > 0 && (
        <TaskSection
          title={intl.formatMessage({ id: "calendar.tasks.upcoming" })}
          count={grouped.upcoming.length}
          tone="neutral"
        >
          {grouped.upcoming.map((task) => renderTask(task))}
        </TaskSection>
      )}

      {pendingCount === 0 && grouped.completed.length > 0 && (
        <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="h-5 w-5 stroke-[2.5]" />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-700">
            {intl.formatMessage({ id: "calendar.tasks.allDone" })}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {intl.formatMessage({ id: "calendar.tasks.allDoneDescription" })}
          </p>
        </div>
      )}

      {showCompleted && grouped.completed.length > 0 && (
        <div className="border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setCompletedOpen((current) => !current)}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
          >
            <span className="flex items-center gap-1.5">
              {completedOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              {intl.formatMessage({ id: "calendar.tasks.completed" })} (
              {grouped.completed.length})
            </span>
          </button>

          {completedOpen && (
            <div className="mt-1 space-y-1">
              {grouped.completed.map((task) => renderTask(task))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskSection({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "danger" | "primary" | "neutral";
  children: ReactNode;
}) {
  const badgeClasses = {
    danger: "text-red-600 bg-red-50",
    primary: "text-blue-600 bg-blue-50",
    neutral: "text-slate-600 bg-slate-100",
  }[tone];
  const titleColor = {
    danger: "text-red-600",
    primary: "text-blue-600",
    neutral: "text-slate-500",
  }[tone];

  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2 px-2 py-1">
        <h3 className={`text-xs font-bold ${titleColor}`}>{title}</h3>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${badgeClasses}`}
        >
          {count}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function TaskRowItem({
  task,
  color,
  locale,
  isOverdue = false,
  readOnly,
  onToggle,
  onSelect,
}: {
  task: CalendarEvent;
  color: string;
  locale: string;
  isOverdue?: boolean;
  readOnly: boolean;
  onToggle?: () => void;
  onSelect: () => void;
}) {
  const completed = Boolean(task.completedAt);
  const taskColor = task.color || task.calendar?.color || color;
  const dateLabel = formatTaskDueDate(task.startAt, task.allDay, locale);
  const isRecurring = Boolean(task.recurrenceRule || task.recurrenceParentId);

  return (
    <div className="group relative flex items-start gap-2.5 rounded-lg border border-transparent p-2 transition-colors hover:border-slate-200/80 hover:bg-slate-50/90">
      {readOnly ? (
        <span
          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md"
          style={{ backgroundColor: `${taskColor}18`, color: taskColor }}
          aria-hidden="true"
        >
          <FolderKanban className="h-3.5 w-3.5" />
        </span>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full border transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          style={{
            borderColor: completed ? taskColor : "#cbd5e1",
            backgroundColor: completed ? taskColor : "transparent",
          }}
          aria-label={task.title}
          aria-checked={completed}
          role="checkbox"
        >
          <Check
            className={`h-3 w-3 stroke-[2.5] transition-opacity ${
              completed
                ? "text-white"
                : "opacity-0 group-hover:opacity-40"
            }`}
            style={completed ? undefined : { color: taskColor }}
          />
        </button>
      )}

      <button
        type="button"
        className="min-w-0 flex-1 cursor-pointer text-left"
        onClick={onSelect}
      >
        <span
          className={`block break-words text-sm font-medium leading-snug ${
            completed
              ? "line-through text-slate-400"
              : "text-slate-700 group-hover:text-slate-900"
          }`}
        >
          {task.title}
        </span>

        {readOnly && task.calendar?.name && (
          <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">
            {task.calendar.name}
          </span>
        )}

        {dateLabel && (
          <span
            className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
              completed
                ? "border-slate-200 bg-slate-50 text-slate-400"
                : isOverdue
                  ? "border-red-200 bg-red-50/60 font-medium text-red-600"
                  : "border-slate-200 bg-white font-medium text-blue-600"
            }`}
          >
            {isOverdue && !completed ? (
              <Clock className="h-3 w-3 shrink-0 text-red-500" />
            ) : task.allDay ? (
              <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
            ) : (
              <Clock
                className={`h-3 w-3 shrink-0 ${
                  completed ? "text-slate-400" : "text-blue-500"
                }`}
              />
            )}
            {dateLabel}
            {isRecurring && (
              <Repeat className="ml-0.5 h-2.5 w-2.5 shrink-0 text-blue-500" />
            )}
          </span>
        )}

        {task.description && cleanTaskDescription(task.description) && (
          <span className="mt-1 block line-clamp-1 text-xs text-slate-400">
            {cleanTaskDescription(task.description)}
          </span>
        )}
      </button>
    </div>
  );
}
