"use client";

import {
  AlertCircle,
  FolderKanban,
  ListTodo,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom/custom-select";

import type { Project } from "@/features/project/types/project";
import { cn } from "@/lib/utils";
import { CalendarEvent } from "../../types/calendar.types";
import {
  filterCalendarTasks,
  isProjectCalendarTask,
  TaskStatusFilter,
  TaskTimeFilter,
} from "../../utils/calendar-tasks.utils";
import { CalendarTaskList } from "./calendar-task-list";

interface CalendarTasksDrawerProps {
  open: boolean;
  tasks: CalendarEvent[];
  projectTaskEvents?: CalendarEvent[];
  projects?: Project[];
  selectedProject?: Project | null;
  onSelectProject?: (projectId: string) => void;
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
  projectTaskEvents = [],
  projects = [],
  selectedProject = null,
  onSelectProject,
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
  const [activeTab, setActiveTab] = useState<TasksDrawerTab>("personal");
  const [timeFilter, setTimeFilter] = useState<TaskTimeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>(() =>
    showCompleted ? "all" : "active",
  );

  const handleStatusFilterChange = (nextStatus: TaskStatusFilter) => {
    setStatusFilter(nextStatus);
    if (nextStatus === "active" && showCompleted) {
      onToggleShowCompleted();
    } else if (
      (nextStatus === "all" || nextStatus === "completed") &&
      !showCompleted
    ) {
      onToggleShowCompleted();
    }
  };

  const effectiveStatusFilter: TaskStatusFilter =
    !showCompleted && statusFilter !== "active" ? "active" : statusFilter;

  const { personalTasks, projectTasks } = useMemo(
    () => ({
      personalTasks: tasks.filter((task) => !isProjectCalendarTask(task)),
      projectTasks:
        projectTaskEvents.length > 0
          ? projectTaskEvents
          : tasks.filter(isProjectCalendarTask),
    }),
    [tasks, projectTaskEvents],
  );
  const displayedTasks =
    activeTab === "personal" ? personalTasks : projectTasks;

  const filteredTasks = useMemo(
    () =>
      filterCalendarTasks(displayedTasks, timeFilter, effectiveStatusFilter),
    [displayedTasks, timeFilter, effectiveStatusFilter],
  );

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  const tabs = [
    {
      value: "personal",
      label: "My tasks",
    },
    {
      value: "project",
      label: "Project tasks",
    },
  ] satisfies Array<{
    value: TasksDrawerTab;
    label: string;
  }>;

  return (
    <>
      {open && (
        <Button
          type="button"
          variant="ghost"
          className="fixed inset-0 z-40 h-auto w-auto cursor-default rounded-none bg-slate-950/30 p-0 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-label="Close"
        />
      )}

      <aside
        className={cn(
          "z-30 flex flex-col border-l border-slate-200 bg-white transition-all duration-300 ease-in-out lg:static lg:z-auto lg:h-full lg:shadow-none",
          // Mobile: fixed overlay from right
          "fixed inset-y-0 right-0 w-full max-w-[400px] shadow-2xl sm:w-[400px]",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          // Desktop: in-flow flex child that pushes the calendar
          open
            ? "lg:w-[400px] lg:opacity-100"
            : "lg:w-0 lg:overflow-hidden lg:opacity-0 lg:border-none pointer-events-none lg:pointer-events-none",
        )}
        role="dialog"
        aria-label="Tasks"
        aria-hidden={!open}
      >
        <div className="flex h-full w-full flex-col sm:w-[400px] lg:w-[400px]">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 px-3 sm:px-4">
            <h2 className="sr-only">Tasks</h2>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              {/* Time filter */}
              <div className="relative flex-1">
                <CustomSelect
                  value={timeFilter}
                  onChange={(value) => setTimeFilter(value as TaskTimeFilter)}
                  ariaLabel="Time filter"
                  options={[
                    {
                      value: "all",
                      label: "All time",
                    },
                    {
                      value: "today",
                      label: "Today",
                    },
                    {
                      value: "week",
                      label: "This week",
                    },
                    {
                      value: "month",
                      label: "This month",
                    },
                    {
                      value: "overdue",
                      label: "Overdue",
                    },
                  ]}
                  triggerClassName="h-8 w-full cursor-pointer truncate rounded-lg border-slate-200 bg-white pl-2.5 pr-6 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  contentClassName="rounded-lg border-slate-200"
                />
              </div>

              {/* Status filter */}
              <div className="relative flex-1">
                <CustomSelect
                  value={effectiveStatusFilter}
                  onChange={(value) =>
                    handleStatusFilterChange(value as TaskStatusFilter)
                  }
                  ariaLabel="Status filter"
                  options={[
                    {
                      value: "all",
                      label: "All",
                    },
                    {
                      value: "active",
                      label: "Incomplete",
                    },
                    {
                      value: "completed",
                      label: "Completed",
                    },
                  ]}
                  triggerClassName="h-8 w-full cursor-pointer truncate rounded-lg border-slate-200 bg-white pl-2.5 pr-6 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  contentClassName="rounded-lg border-slate-200"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              aria-label="Close"
            >
              <X className="h-4.5 w-4.5" />
            </Button>
          </header>

          <div
            className="grid shrink-0 grid-cols-2 gap-1 border-b border-slate-200/80 bg-slate-50/70 p-1.5"
            role="tablist"
            aria-label="Tasks"
          >
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                variant="ghost"
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
              </Button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {activeTab === "project" && projects.length > 0 && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 shadow-2xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: selectedProject?.color || color }}
                  />
                  <span className="truncate text-xs font-bold text-slate-700">
                    {selectedProject ? selectedProject.name : "Select project"}
                  </span>
                </div>
                <div className="w-40 shrink-0">
                  <CustomSelect
                    placeholder="Select project"
                    value={selectedProject?.id || ""}
                    onChange={(value) => onSelectProject?.(value)}
                    ariaLabel="Select project"
                    options={projects.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                    triggerClassName="h-7 w-full cursor-pointer truncate rounded-lg border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                    contentClassName="rounded-lg border-slate-200"
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
              </div>
            ) : error && displayedTasks.length === 0 ? (
              <TaskLoadError onRetry={onRetry} />
            ) : displayedTasks.length === 0 ? (
              <TaskEmptyState
                tab={activeTab}
                color={color}
                selectedProject={selectedProject}
                projects={projects}
                onSelectProject={onSelectProject}
              />
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400"
                  aria-hidden="true"
                >
                  <ListTodo className="h-5 w-5" />
                </span>
                <p className="mt-3 text-xs font-semibold text-slate-600">
                  No tasks match the selected filter
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {error && <TaskLoadError compact onRetry={onRetry} />}
                <CalendarTaskList
                  tasks={filteredTasks}
                  color={color}
                  statusFilter={effectiveStatusFilter}
                  readOnly={activeTab === "project"}
                  showCompleted={showCompleted}
                  onToggleTask={onToggleTask}
                  onSelectTask={onSelectTask}
                />
              </div>
            )}
          </div>
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
  if (compact) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        role="alert"
      >
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">Could not load tasks</span>
        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRetry}
            className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
            aria-label="Retry"
            title="Retry"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
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
        Could not load tasks
      </p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

function TaskEmptyState({
  tab,
  color,
  selectedProject,
  projects,
  onSelectProject,
}: {
  tab: TasksDrawerTab;
  color: string;
  selectedProject?: Project | null;
  projects?: Project[];
  onSelectProject?: (projectId: string) => void;
}) {
  const projectTab = tab === "project";

  if (projectTab && !selectedProject && projects && projects.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <span
          className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-600"
          aria-hidden="true"
        >
          <FolderKanban className="h-6 w-6" />
        </span>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          No project selected
        </p>
        <p className="mt-1 max-w-[240px] text-xs text-slate-400">
          Select a project from the sidebar or dropdown below to view project
          tasks
        </p>
        <div className="mt-4 w-56">
          <CustomSelect
            value=""
            onChange={(val) => onSelectProject?.(val)}
            ariaLabel="Select project"
            placeholder="Select a project..."
            options={projects.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
            triggerClassName="h-9 w-full cursor-pointer rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
            contentClassName="rounded-xl border-slate-200"
          />
        </div>
      </div>
    );
  }

  const activeColor = selectedProject?.color || color;

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <span
        className="grid h-12 w-12 place-items-center rounded-xl"
        style={{ backgroundColor: activeColor + "15", color: activeColor }}
        aria-hidden="true"
      >
        {projectTab ? (
          <FolderKanban className="h-6 w-6" />
        ) : (
          <ListTodo className="h-6 w-6" />
        )}
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-700">
        {projectTab
          ? selectedProject
            ? `No tasks in ${selectedProject.name}`
            : "No project tasks"
          : "No tasks yet"}
      </p>
      <p className="mt-1 max-w-[220px] text-xs text-slate-400">
        {projectTab
          ? "Tasks created in this project will appear here"
          : "All your personal tasks will appear here"}
      </p>
    </div>
  );
}
