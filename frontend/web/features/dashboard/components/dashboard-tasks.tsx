import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardPanel, EmptyState, QueryFeedback } from "./dashboard-panel";
import { taskBucket, taskDate } from "../utils/dashboard.utils";
import type { useDashboard } from "../hooks/use-dashboard";

const TASK_PREVIEW_LIMIT = 6;
const PRIORITY_TONES: Record<string, string> = {
  URGENT: "bg-destructive-soft text-destructive-content",
  HIGH: "bg-warning-soft text-warning-content",
  LOW: "bg-secondary text-secondary-foreground",
};

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
            className={`min-h-11 cursor-pointer rounded-t-control border-b-2 px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-150 sm:min-h-9 [@media(pointer:coarse)]:min-h-11 ${filter === taskFilter ? "border-link bg-primary-soft text-primary-soft-foreground" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"}`}
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
                className="group grid min-w-0 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-control border-b border-border px-2 py-4 hover:bg-muted active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-150 sm:flex"
              >
                <div className="min-w-0 flex-1">
                  <span className="line-clamp-2 break-words text-sm font-medium text-foreground group-hover:text-link [overflow-wrap:anywhere]">
                    {task.title}
                  </span>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                    {task.projectName && <span className="min-w-0 truncate text-xs text-muted-foreground">{task.projectName}</span>}
                    {task.priority !== "MEDIUM" && <Badge variant="secondary" className={`max-w-full whitespace-normal break-words ${PRIORITY_TONES[task.priority] ?? ""}`}>{task.priority.toLowerCase()}</Badge>}
                  </div>
                </div>
                <Badge variant="secondary"
                  className={`col-start-1 row-start-2 max-w-full justify-self-start whitespace-normal break-words ${bucket === "Overdue" ? "bg-destructive-soft text-destructive-content" : bucket === "Today" ? "bg-primary-soft text-primary-soft-foreground" : ""}`}
                  title={taskDate(task, zone)}
                >
                  {bucket === "Upcoming" ? taskDate(task, zone) : bucket}
                </Badge>
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
