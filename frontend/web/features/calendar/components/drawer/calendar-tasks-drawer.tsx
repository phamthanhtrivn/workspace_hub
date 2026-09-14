"use client";

import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  ListTodo,
  Repeat,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CALENDAR_SHOW_COMPLETED_STORAGE_KEY } from "../../types/calendar.constants";
import { CalendarEvent } from "../../types/calendar.types";
import {
  formatTaskDueDate,
  groupCalendarTasks,
} from "../../utils/calendar-tasks.utils";
import { cleanTaskDescription } from "../../utils/calendar-event.utils";

interface CalendarTasksDrawerProps {
  open: boolean;
  tasks: CalendarEvent[];
  color?: string;
  loading?: boolean;
  showCompleted?: boolean;
  onToggleShowCompleted?: () => void;
  onClose: () => void;
  onAddTask?: () => void;
  onToggleTask: (task: CalendarEvent) => void;
  onSelectTask: (task: CalendarEvent) => void;
}

export function CalendarTasksDrawer({
  open,
  tasks,
  color = "#f59e0b",
  loading = false,
  showCompleted: externalShowCompleted,
  onToggleShowCompleted,
  onClose,
  onToggleTask,
  onSelectTask,
}: CalendarTasksDrawerProps) {
  const intl = useAppIntl();
  // Standard Google Tasks: completed tasks section is collapsed by default
  const [completedOpen, setCompletedOpen] = useState(false);

  // Internal showCompleted fallback if not controlled externally
  const [internalShowCompleted, setInternalShowCompleted] = useState<boolean>(
    () => {
      try {
        const saved = window.localStorage.getItem(
          CALENDAR_SHOW_COMPLETED_STORAGE_KEY,
        );
        return saved !== null ? saved === "true" : true;
      } catch {
        return true;
      }
    },
  );

  const showCompleted = externalShowCompleted ?? internalShowCompleted;
  const handleToggleShowCompleted = () => {
    if (onToggleShowCompleted) {
      onToggleShowCompleted();
    } else {
      setInternalShowCompleted((prev) => {
        const next = !prev;
        try {
          window.localStorage.setItem(
            CALENDAR_SHOW_COMPLETED_STORAGE_KEY,
            String(next),
          );
        } catch {}
        return next;
      });
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const grouped = useMemo(() => groupCalendarTasks(tasks), [tasks]);
  const pendingCount =
    grouped.overdue.length + grouped.today.length + grouped.upcoming.length;

  if (!open) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs transition-opacity lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[380px] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-200 ease-out sm:w-[380px] lg:shadow-none"
        role="dialog"
        aria-label={intl.formatMessage({ id: "calendar.tasks" })}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 px-4">
          <div className="flex items-center gap-2.5">
            <div
              className="grid h-8 w-8 place-items-center rounded-lg"
              style={{ backgroundColor: `${color}18`, color }}
            >
              <ListTodo className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-800">
                  {intl.formatMessage({ id: "calendar.tasks" })}
                </h2>
                {pendingCount > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {pendingCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle show/hide completed tasks */}
            <button
              type="button"
              onClick={handleToggleShowCompleted}
              className={`grid h-8 w-8 cursor-pointer place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                showCompleted
                  ? "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200/80 hover:text-slate-600"
              }`}
              title={intl.formatMessage({
                id: showCompleted
                  ? "calendar.tasks.hideCompleted"
                  : "calendar.tasks.showCompleted",
              })}
              aria-label={intl.formatMessage({
                id: showCompleted
                  ? "calendar.tasks.hideCompleted"
                  : "calendar.tasks.showCompleted",
              })}
            >
              {showCompleted ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              aria-label={intl.formatMessage({ id: "app.close" })}
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl"
                style={{ backgroundColor: `${color}15`, color }}
              >
                <ListTodo className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {intl.formatMessage({ id: "calendar.tasks.noTasks" })}
              </p>
              <p className="mt-1 text-xs text-slate-400 max-w-[220px]">
                {intl.formatMessage({
                  id: "calendar.tasks.noTasksDescription",
                })}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overdue */}
              {grouped.overdue.length > 0 && (
                <TaskSection
                  title={intl.formatMessage({ id: "calendar.tasks.overdue" })}
                  count={grouped.overdue.length}
                  tone="danger"
                >
                  {grouped.overdue.map((task) => (
                    <TaskRowItem
                      key={task.id}
                      task={task}
                      color={color}
                      locale={intl.locale}
                      isOverdue
                      onToggle={() => onToggleTask(task)}
                      onSelect={() => onSelectTask(task)}
                    />
                  ))}
                </TaskSection>
              )}

              {/* Today */}
              {grouped.today.length > 0 && (
                <TaskSection
                  title={intl.formatMessage({ id: "calendar.tasks.today" })}
                  count={grouped.today.length}
                  tone="primary"
                >
                  {grouped.today.map((task) => (
                    <TaskRowItem
                      key={task.id}
                      task={task}
                      color={color}
                      locale={intl.locale}
                      onToggle={() => onToggleTask(task)}
                      onSelect={() => onSelectTask(task)}
                    />
                  ))}
                </TaskSection>
              )}

              {/* Upcoming */}
              {grouped.upcoming.length > 0 && (
                <TaskSection
                  title={intl.formatMessage({ id: "calendar.tasks.upcoming" })}
                  count={grouped.upcoming.length}
                  tone="neutral"
                >
                  {grouped.upcoming.map((task) => (
                    <TaskRowItem
                      key={task.id}
                      task={task}
                      color={color}
                      locale={intl.locale}
                      onToggle={() => onToggleTask(task)}
                      onSelect={() => onSelectTask(task)}
                    />
                  ))}
                </TaskSection>
              )}

              {/* All caught up banner if pending count is 0 */}
              {pendingCount === 0 && grouped.completed.length > 0 && (
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-700">
                    {intl.formatMessage({ id: "calendar.tasks.allDone" })}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {intl.formatMessage({
                      id: "calendar.tasks.allDoneDescription",
                    })}
                  </p>
                </div>
              )}

              {/* Completed Accordion (standard Google Tasks: collapsed by default, hideable) */}
              {showCompleted && grouped.completed.length > 0 && (
                <div className="border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={() => setCompletedOpen((prev) => !prev)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-1.5">
                      {completedOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {intl.formatMessage({
                          id: "calendar.tasks.completed",
                        })}{" "}
                        ({grouped.completed.length})
                      </span>
                    </div>
                  </button>

                  {completedOpen && (
                    <div className="mt-1 space-y-1">
                      {grouped.completed.map((task) => (
                        <TaskRowItem
                          key={task.id}
                          task={task}
                          color={color}
                          locale={intl.locale}
                          onToggle={() => onToggleTask(task)}
                          onSelect={() => onSelectTask(task)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
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
  children: React.ReactNode;
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
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className={`text-xs font-bold tracking-tight ${titleColor}`}>
          {title}
        </span>
        <span
          className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${badgeClasses}`}
        >
          {count}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function TaskRowItem({
  task,
  color,
  locale,
  isOverdue = false,
  onToggle,
  onSelect,
}: {
  task: CalendarEvent;
  color: string;
  locale: string;
  isOverdue?: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const completed = Boolean(task.completedAt);
  const taskColor = task.color || color;
  const dateLabel = formatTaskDueDate(task.startAt, task.allDay, locale);
  const isRecurring = Boolean(task.recurrenceRule || task.recurrenceSeriesId);

  return (
    <div className="group relative flex items-start gap-2.5 rounded-xl border border-transparent p-2 transition-colors hover:border-slate-200/80 hover:bg-slate-50/90">
      {/* Circle checkbox */}
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
        {completed ? (
          <Check className="h-3 w-3 stroke-[2.5] text-white" />
        ) : (
          <Check
            className="h-3 w-3 stroke-[2.5] opacity-0 transition-opacity group-hover:opacity-40"
            style={{ color: taskColor }}
          />
        )}
      </button>

      {/* Task text / click to open details */}
      <div
        className="min-w-0 flex-1 cursor-pointer select-none"
        onClick={onSelect}
      >
        <p
          className={`text-sm font-medium leading-snug break-words ${
            completed
              ? "line-through text-slate-400"
              : "text-slate-700 group-hover:text-slate-900"
          }`}
        >
          {task.title}
        </p>

        {dateLabel && (
          <div
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
            <span>{dateLabel}</span>
            {isRecurring && (
              <Repeat className="ml-0.5 h-2.5 w-2.5 shrink-0 text-blue-500" />
            )}
          </div>
        )}

        {task.description && cleanTaskDescription(task.description) && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-400">
            {cleanTaskDescription(task.description)}
          </p>
        )}
      </div>
    </div>
  );
}
