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
      <div className="mb-3 flex flex-wrap gap-1" aria-label="Filter tasks">
        {(["All", "Overdue", "Today"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            aria-pressed={filter === taskFilter}
            onClick={() => setTaskFilter(filter)}
            className={`min-h-11 border-b-2 px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9 [@media(pointer:coarse)]:min-h-11 ${filter === taskFilter ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
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
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-border py-4 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {task.title}
                  </span>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {task.projectName}
                    {task.priority !== "MEDIUM" &&
                      ` · ${task.priority.toLowerCase()}`}
                  </p>
                </div>
                <span
                  className={`col-start-1 row-start-2 shrink-0 text-xs font-medium ${bucket === "Overdue" ? "text-destructive" : bucket === "Today" ? "text-primary" : "text-muted-foreground"}`}
                  title={taskDate(task, zone)}
                >
                  {bucket === "Upcoming" ? taskDate(task, zone) : bucket}
                </span>
                <ArrowUpRight
                  aria-hidden
                  size={16}
                  className="col-start-2 row-span-2 row-start-1 shrink-0 text-primary"
                />
              </Link>
            </li>
          );
        })}
      </ul>
      {visibleTasks.length > 6 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing 6 of {visibleTasks.length} open tasks
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 text-xs font-medium text-primary">
        <Link href="/calendar" className="inline-flex min-h-11 items-center hover:underline sm:min-h-6 [@media(pointer:coarse)]:min-h-11">
          Personal tasks
        </Link>
        <Link href="/projects" className="inline-flex min-h-11 items-center hover:underline sm:min-h-6 [@media(pointer:coarse)]:min-h-11">
          Project tasks
        </Link>
      </div>
    </DashboardPanel>
  );
}
