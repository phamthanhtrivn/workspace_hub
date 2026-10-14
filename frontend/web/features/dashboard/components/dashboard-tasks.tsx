import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DashboardPanel, EmptyState, QueryFeedback } from "./dashboard-panel";
import { taskBucket, taskDate } from "../utils/dashboard.utils";
import type { useDashboard } from "../hooks/use-dashboard";

export function DashboardTasks({
  dashboard,
}: {
  dashboard: ReturnType<typeof useDashboard>;
}) {
  const { tasks, today, zone, personal, project, taskFilter, setTaskFilter } =
    dashboard;
  const visibleTasks = tasks.filter(
    (task) =>
      taskFilter === "All" || taskBucket(task, today, zone) === taskFilter,
  );
  return (
    <DashboardPanel
      title="My tasks"
      description="Your priorities, across personal tasks and projects"
    >
      <QueryFeedback query={personal} label="personal tasks" />
      <QueryFeedback query={project} label="project tasks" />
      <div className="mb-3 flex gap-1" aria-label="Filter tasks">
        {(["All", "Overdue", "Today"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            aria-pressed={filter === taskFilter}
            onClick={() => setTaskFilter(filter)}
            className={`min-h-9 border-b-2 px-3 py-1.5 text-xs font-medium ${filter === taskFilter ? "border-[var(--color-primary)] text-[var(--color-primary-dark)]" : "border-transparent text-slate-500 hover:text-[var(--color-primary-dark)]"}`}
          >
            {filter}
          </button>
        ))}
      </div>
      {!visibleTasks.length && personal.isSuccess && project.isSuccess && (
        <EmptyState>
          {taskFilter === "All"
            ? "You are all caught up. No open tasks."
            : taskFilter === "Overdue"
              ? "No overdue tasks."
              : "No tasks due today."}
        </EmptyState>
      )}
      <ul>
        {visibleTasks.slice(0, 6).map((task) => {
          const bucket = taskBucket(task, today, zone);
          return (
            <li key={task.key}>
              <Link
                href={task.href}
                aria-label={`Open ${task.title}`}
                className="flex items-center gap-3 border-b border-border py-4 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {task.title}
                  </span>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {task.projectName}
                    {task.priority !== "MEDIUM" &&
                      ` · ${task.priority.toLowerCase()}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-medium sm:text-xs ${bucket === "Overdue" ? "text-[var(--color-destructive)]" : bucket === "Today" ? "text-[var(--color-primary)]" : "text-slate-500"}`}
                  title={taskDate(task, zone)}
                >
                  {bucket === "Upcoming" ? taskDate(task, zone) : bucket}
                </span>
                <ArrowUpRight
                  aria-hidden
                  size={16}
                  className="shrink-0 text-primary"
                />
              </Link>
            </li>
          );
        })}
      </ul>
      {visibleTasks.length > 6 && (
        <p className="mt-3 text-xs text-slate-500">
          Showing 6 of {visibleTasks.length} open tasks
        </p>
      )}
      <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 text-xs font-medium text-[var(--color-primary)]">
        <Link href="/calendar" className="hover:underline">
          Personal tasks
        </Link>
        <Link href="/projects" className="hover:underline">
          Project tasks
        </Link>
      </div>
    </DashboardPanel>
  );
}
