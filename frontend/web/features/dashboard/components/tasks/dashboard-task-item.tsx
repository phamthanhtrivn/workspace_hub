import Link from "next/link";
import { ArrowUpRight, CalendarCheck2, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardTask } from "../../types/dashboard.types";
import { taskBucket, taskDate } from "../../utils/dashboard.utils";

const PRIORITY_TONES: Record<string, string> = {
  URGENT: "bg-destructive-soft text-destructive-content",
  HIGH: "bg-warning-soft text-warning-content",
  LOW: "bg-secondary text-secondary-foreground",
};

interface DashboardTaskItemProps {
  task: DashboardTask;
  today: string;
  zone: string;
}

export function DashboardTaskItem({ task, today, zone }: DashboardTaskItemProps) {
  const bucket = taskBucket(task, today, zone);
  const dueDate = taskDate(task, zone);
  const isProjectTask = task.source === "project";
  const SourceIcon = isProjectTask ? FolderKanban : CalendarCheck2;

  return (
    <li className="min-w-0 border-b border-border last:border-b-0">
      <Button
        asChild
        variant="ghost"
        className="group grid h-auto min-h-16 w-full min-w-0 grid-cols-[2rem_minmax(0,1fr)_1rem] items-start gap-x-3 gap-y-2 whitespace-normal rounded-control px-3 py-3 text-left font-normal hover:bg-muted active:bg-accent focus-visible:ring-inset motion-reduce:transition-none sm:grid-cols-[2rem_minmax(0,1fr)_auto_1rem] sm:items-center"
      >
        <Link href={task.href} aria-label={`Open ${task.title}`}>
          <span
            className={cn(
              "col-start-1 row-span-2 row-start-1 grid size-8 shrink-0 place-items-center rounded-control sm:row-span-1",
              isProjectTask
                ? "bg-primary-soft text-primary-soft-foreground"
                : "bg-secondary text-muted-foreground",
            )}
          >
            <SourceIcon aria-hidden="true" />
          </span>
          <div className="col-start-2 row-start-1 min-w-0">
            <span className="line-clamp-2 break-words text-sm font-medium text-foreground group-hover:text-link [overflow-wrap:anywhere]">
              {task.title}
            </span>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              {task.projectName && (
                <span className="min-w-0 truncate text-xs text-muted-foreground" title={task.projectName}>
                  {task.projectName}
                </span>
              )}
              {task.priority !== "MEDIUM" && (
                <Badge variant="secondary" className={cn("max-w-full whitespace-normal break-words font-medium", PRIORITY_TONES[task.priority])}>
                  {task.priority.toLowerCase()}
                </Badge>
              )}
            </div>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "col-start-2 row-start-2 max-w-full justify-self-start whitespace-normal break-words font-medium sm:col-start-3 sm:row-start-1",
              bucket === "Overdue" && "bg-destructive-soft text-destructive-content",
              bucket === "Today" && "bg-primary-soft text-primary-soft-foreground",
            )}
            title={dueDate || undefined}
          >
            {bucket === "Upcoming" ? dueDate : bucket}
          </Badge>
          <ArrowUpRight
            aria-hidden="true"
            className="col-start-3 row-span-2 row-start-1 self-center text-muted-foreground group-hover:text-link group-focus-visible:text-link sm:col-start-4 sm:row-span-1"
          />
        </Link>
      </Button>
    </li>
  );
}
