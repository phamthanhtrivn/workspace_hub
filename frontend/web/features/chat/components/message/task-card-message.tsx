"use client";

import { useMemo } from "react";
import { CheckSquare, ExternalLink, FolderGit2, Clock } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/features/project/components/ui/status-badge";
import { TaskPriority, TaskStatus } from "@/features/project/types/project";
import { Button } from '@/components/ui/button';

interface TaskCardMessageProps {
  content: string;
  projectId?: string | null;
  className?: string;
  variant?: "default" | "thread";
}

export default function TaskCardMessage({
  content,
  projectId: propProjectId,
  className = "",
  variant = "default",
}: TaskCardMessageProps) {
  const isThread = variant === "thread";
  const parsed = useMemo(() => {
    if (!content) {
      return {
        title: "Task Discussion",
        deleted: false,
        taskId: "",
        projectId: propProjectId || "",
        status: "",
        priority: "",
        dueDate: "",
        tag: "",
      };
    }

    try {
      const trimmed = content.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const json = JSON.parse(trimmed);
        return {
          title: json.title || "Task Discussion",
          deleted: json.deleted === true,
          taskId: json.taskId || "",
          projectId: json.projectId || propProjectId || "",
          status: json.status || "",
          priority: json.priority || "",
          dueDate: json.dueDate || "",
          tag: json.tag || (json.taskId ? `[Task #${json.taskId.slice(0, 8)}]` : ""),
        };
      }
    } catch {
      // fallback to string parsing below
    }

    let taskId = "";
    const match = content.match(/\[Task #([a-f0-9-]+)\]/i);
    if (match) {
      taskId = match[1];
    }
    const title = content
      .replace(/📋 Discussion Thread:\s*/i, "")
      .replace(/\[Task #[^\]]+\]/i, "")
      .trim();

    return {
      title: title || "Task Discussion",
      deleted: false,
      taskId,
      projectId: propProjectId || "",
      status: "",
      priority: "",
      dueDate: "",
      tag: taskId ? `[Task #${taskId.slice(0, 8)}]` : "",
    };
  }, [content, propProjectId]);

  const status = Object.values(TaskStatus).find((value) => value === parsed.status);
  const priority = Object.values(TaskPriority).find((value) => value === parsed.priority);
  const targetUrl =
    parsed.projectId && parsed.taskId
      ? `/projects/${parsed.projectId}?taskId=${parsed.taskId}`
      : parsed.projectId
        ? `/projects/${parsed.projectId}`
        : null;

  return (
    <div
      className={cn(
        "w-full max-w-md rounded-panel border border-border bg-success-soft p-4 transition-all",
        isThread && "min-w-0 max-w-full p-3",
        className,
      )}
    >
      <div className={cn(
        "flex items-center justify-between gap-2 border-b border-border/70 pb-2.5",
        isThread && "min-w-0 flex-wrap justify-start",
      )}>
        <div className={cn("flex items-center gap-1.5", isThread && "shrink-0")}>
          <div className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg bg-success text-success-foreground",
            isThread && "shrink-0",
          )}>
            <CheckSquare size={13} />
          </div>
          <span className={cn(
            "text-xs font-semibold tracking-wider text-success-content uppercase",
            isThread && "whitespace-nowrap",
          )}>
            Task Card
          </span>
        </div>
        {parsed.tag && (
          <span className={cn(
            "rounded-full bg-success-soft/80 px-2.5 py-0.5 text-xs font-mono font-semibold text-success-content",
            isThread && "max-w-full [overflow-wrap:anywhere]",
          )}>
            {parsed.tag}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <h4 className={cn("text-sm font-semibold text-foreground leading-snug", isThread && "[overflow-wrap:anywhere]")}>
          {parsed.title}
        </h4>

        {parsed.deleted && <p role="status" className="text-xs font-medium text-destructive-content">This task has been deleted.</p>}
        {!parsed.deleted && <div className="flex flex-wrap items-center gap-2">
          {parsed.status && (
            status ? (
              <TaskStatusBadge status={status} compact />
            ) : (
              <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                {String(parsed.status).replace(/_/g, " ")}
              </span>
            )
          )}

          {parsed.priority && (
            priority ? (
              <TaskPriorityBadge priority={priority} compact />
            ) : (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {String(parsed.priority)}
              </span>
            )
          )}

          {parsed.dueDate && (
            <span className={cn(
              "inline-flex items-center gap-1 text-xs text-muted-foreground font-medium",
              isThread && "min-w-0 max-w-full [overflow-wrap:anywhere]",
            )}>
              <Clock size={12} className={cn("text-muted-foreground", isThread && "shrink-0")} />
              <span>Due: {formatDateTime(parsed.dueDate)}</span>
            </span>
          )}
        </div>}
      </div>

      {targetUrl && (
        <div className={cn(
          "mt-3.5 flex items-center justify-between gap-2 pt-2.5 border-t border-border/70",
          isThread && "flex-col items-stretch",
        )}>
          <span className={cn("flex items-center gap-1 text-xs text-muted-foreground font-medium", isThread && "whitespace-nowrap")}>
            <FolderGit2 size={12} className={cn("text-success-content", isThread && "shrink-0")} />
            <span>Project Task</span>
          </span>
          {parsed.deleted ? (
            <Button disabled variant="secondary" size="sm" className={cn('text-xs', isThread && 'w-full')}>
              View Task Detail
            </Button>
          ) : <Link
            href={targetUrl}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-panel bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:bg-success transition-colors cursor-pointer",
              isThread && "min-h-9 w-full justify-center whitespace-nowrap rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
            )}
          >
            <span>View Task Detail</span>
            <ExternalLink size={12} className={isThread ? "shrink-0" : undefined} />
          </Link>}
        </div>
      )}
    </div>
  );
}

