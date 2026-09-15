"use client";

import {
  AlertCircle,
  Eye,
  EyeOff,
  FolderKanban,
  ListTodo,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import { CalendarEvent } from "../../types/calendar.types";
import { isProjectCalendarTask } from "../../utils/calendar-tasks.utils";
import { CalendarTaskList } from "./calendar-task-list";

interface CalendarTasksDrawerProps {
  open: boolean;
  tasks: CalendarEvent[];
  color?: string;
  loading?: boolean;
  error?: boolean;
  showCompleted: boolean;
  onToggleShowCompleted: () => void;
  onClose: () => void;
  onRetry?: () => void;
  onToggleTask: (task: CalendarEvent) => void;
  onSelectTask: (task: CalendarEvent) => void;
}

type TasksDrawerTab = "personal" | "project";

export function CalendarTasksDrawer({
  open,
  tasks,
  color = "#f59e0b",
  loading = false,
  error = false,
  showCompleted,
  onToggleShowCompleted,
  onClose,
  onRetry,
  onToggleTask,
  onSelectTask,
}: CalendarTasksDrawerProps) {
  const intl = useAppIntl();
  const [activeTab, setActiveTab] = useState<TasksDrawerTab>("personal");
  const { personalTasks, projectTasks } = useMemo(
    () => ({
      personalTasks: tasks.filter((task) => !isProjectCalendarTask(task)),
      projectTasks: tasks.filter(isProjectCalendarTask),
    }),
    [tasks],
  );
  const displayedTasks =
    activeTab === "personal" ? personalTasks : projectTasks;
  const pendingCount = displayedTasks.filter(
    (task) => !task.completedAt,
  ).length;

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const tabs = [
    {
      value: "personal",
      label: intl.formatMessage({ id: "calendar.quick.myTasks" }),
      count: personalTasks.length,
    },
    {
      value: "project",
      label: intl.formatMessage({ id: "calendar.quick.projectTasks" }),
      count: projectTasks.length,
    },
  ] satisfies Array<{
    value: TasksDrawerTab;
    label: string;
    count: number;
  }>;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[380px] flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[380px] lg:shadow-none"
        role="dialog"
        aria-label={intl.formatMessage({ id: "calendar.tasks" })}
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
              style={{ backgroundColor: color + "18", color }}
              aria-hidden="true"
            >
              <ListTodo className="h-4.5 w-4.5" />
            </span>
            <h2 className="truncate text-sm font-semibold text-slate-800">
              {intl.formatMessage({ id: "calendar.tasks" })}
            </h2>
            {pendingCount > 0 && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {pendingCount}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onToggleShowCompleted}
              className={cn(
                "grid h-8 w-8 cursor-pointer place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                showCompleted
                  ? "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200/80",
              )}
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
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              aria-label={intl.formatMessage({ id: "app.close" })}
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <div
          className="grid shrink-0 grid-cols-2 gap-1 border-b border-slate-200/80 bg-slate-50/70 p-1.5"
          role="tablist"
          aria-label={intl.formatMessage({ id: "calendar.tasks" })}
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                activeTab === tab.value
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-700",
              )}
            >
              <span className="truncate">{tab.label}</span>
              <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            </div>
          ) : error && displayedTasks.length === 0 ? (
            <TaskLoadError onRetry={onRetry} />
          ) : displayedTasks.length === 0 ? (
            <TaskEmptyState tab={activeTab} color={color} />
          ) : (
            <div className="space-y-4">
              {error && <TaskLoadError compact onRetry={onRetry} />}
              <CalendarTaskList
                tasks={displayedTasks}
                color={color}
                readOnly={activeTab === "project"}
                showCompleted={showCompleted}
                onToggleTask={onToggleTask}
                onSelectTask={onSelectTask}
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function TaskLoadError({
  compact = false,
  onRetry,
}: {
  compact?: boolean;
  onRetry?: () => void;
}) {
  const intl = useAppIntl();

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        role="alert"
      >
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">
          {intl.formatMessage({ id: "calendar.tasks.loadFailed" })}
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
            aria-label={intl.formatMessage({ id: "app.retry" })}
            title={intl.formatMessage({ id: "app.retry" })}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-12 text-center"
      role="alert"
    >
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-600">
        <AlertCircle className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-700">
        {intl.formatMessage({ id: "calendar.tasks.loadFailed" })}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {intl.formatMessage({ id: "app.retry" })}
        </button>
      )}
    </div>
  );
}

function TaskEmptyState({
  tab,
  color,
}: {
  tab: TasksDrawerTab;
  color: string;
}) {
  const intl = useAppIntl();
  const projectTab = tab === "project";

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <span
        className="grid h-12 w-12 place-items-center rounded-xl"
        style={{ backgroundColor: color + "15", color }}
        aria-hidden="true"
      >
        {projectTab ? (
          <FolderKanban className="h-6 w-6" />
        ) : (
          <ListTodo className="h-6 w-6" />
        )}
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-700">
        {intl.formatMessage({
          id: projectTab
            ? "calendar.tasks.noProjectTasks"
            : "calendar.tasks.noTasks",
        })}
      </p>
      <p className="mt-1 max-w-[220px] text-xs text-slate-400">
        {intl.formatMessage({
          id: projectTab
            ? "calendar.tasks.noProjectTasksDescription"
            : "calendar.tasks.noTasksDescription",
        })}
      </p>
    </div>
  );
}
