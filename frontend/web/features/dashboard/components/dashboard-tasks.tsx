import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPanel, EmptyState, QueryFeedback } from "./dashboard-panel";
import { taskBucket, taskDate } from "../utils/dashboard.utils";
import type { useDashboard } from "../hooks/use-dashboard";

const TASK_PREVIEW_LIMIT = 6;

export function DashboardTasks({
  dashboard,
}: {
  dashboard: ReturnType<typeof useDashboard>;
}) {
  const { tasks, today, zone, personal, project, taskFilter, setTaskFilter } =
    dashboard;
  const taskListId = useId();
  const [taskLimits, setTaskLimits] = useState<Record<typeof taskFilter, number>>({
    All: TASK_PREVIEW_LIMIT,
    Overdue: TASK_PREVIEW_LIMIT,
    Today: TASK_PREVIEW_LIMIT,
  });
  const visibleTasks = tasks.filter(
    (task) =>
      taskFilter === "All" || taskBucket(task, today, zone) === taskFilter,
  );
  const shownCount = Math.min(taskLimits[taskFilter], visibleTasks.length);
  const remainingCount = visibleTasks.length - shownCount;
  const nextCount = Math.min(TASK_PREVIEW_LIMIT, remainingCount);
  return (
    <DashboardPanel
      title="My tasks"
      description="Personal and project tasks, ordered by due status and priority"
    >
      <QueryFeedback query={personal} label="personal tasks" />
      <QueryFeedback query={project} label="project tasks" />
      <div role="group" className="mb-3 flex flex-wrap gap-1" aria-label="Filter tasks">
        {(["All", "Overdue", "Today"] as const).map((filter) => (
          <Button variant="unstyled"
            key={filter}
            type="button"
            aria-pressed={filter === taskFilter}
            onClick={() => setTaskFilter(filter)}
            className={`min-h-11 cursor-pointer border-b-2 px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9 [@media(pointer:coarse)]:min-h-11 ${filter === taskFilter ? "border-link text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {filter}
          </Button>
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
      <ul id={taskListId}>
        {visibleTasks.slice(0, shownCount).map((task) => {
          const bucket = taskBucket(task, today, zone);
          return (
            <li key={task.key}>
              <Link
                href={task.href}
                aria-label={`Open ${task.title}`}
                className="grid min-w-0 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-border py-4 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex"
              >
                <div className="min-w-0 flex-1">
                  <span className="line-clamp-2 break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                    {task.title}
                  </span>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {task.projectName}
                    {task.priority !== "MEDIUM" &&
                      ` · ${task.priority.toLowerCase()}`}
                  </p>
                </div>
                <span
                  className={`col-start-1 row-start-2 shrink-0 text-xs font-medium ${bucket === "Overdue" ? "text-destructive-content" : bucket === "Today" ? "text-link" : "text-muted-foreground"}`}
                  title={taskDate(task, zone)}
                >
                  {bucket === "Upcoming" ? taskDate(task, zone) : bucket}
                </span>
                <ArrowUpRight
                  aria-hidden
                  size={16}
                  className="col-start-2 row-span-2 row-start-1 shrink-0 text-link"
                />
              </Link>
            </li>
          );
        })}
      </ul>
      {visibleTasks.length > TASK_PREVIEW_LIMIT && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-xs text-muted-foreground">
            Showing {shownCount} of {visibleTasks.length} open tasks
          </p>
          <Button
            type="button"
            variant="outline"
            aria-controls={taskListId}
            aria-expanded={shownCount > TASK_PREVIEW_LIMIT}
            onClick={() =>
              setTaskLimits((limits) => ({
                ...limits,
                [taskFilter]: remainingCount
                  ? limits[taskFilter] + TASK_PREVIEW_LIMIT
                  : TASK_PREVIEW_LIMIT,
              }))
            }
            className="h-auto min-h-11 max-w-full whitespace-normal sm:min-h-9 [@media(pointer:coarse)]:min-h-11"
          >
            {remainingCount
              ? `Show ${nextCount} more ${nextCount === 1 ? "task" : "tasks"}`
              : "Show fewer tasks"}
          </Button>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 text-xs font-medium text-link">
        <Link href="/calendar" className="inline-flex min-h-11 cursor-pointer items-center hover:underline sm:min-h-6 [@media(pointer:coarse)]:min-h-11">
          Personal tasks
        </Link>
        <Link href="/projects" className="inline-flex min-h-11 cursor-pointer items-center hover:underline sm:min-h-6 [@media(pointer:coarse)]:min-h-11">
          Project tasks
        </Link>
      </div>
    </DashboardPanel>
  );
}
