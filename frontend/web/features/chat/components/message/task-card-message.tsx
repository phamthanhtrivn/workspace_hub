"use client";

import { useMemo } from "react";
import { CheckSquare, ExternalLink, FolderGit2, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";

interface TaskCardMessageProps {
  content: string;
  projectId?: string | null;
  className?: string;
  variant?: "default" | "thread";
}

const statusBadgeStyles: Record<string, string> = {
  TODO: "bg-muted text-foreground border-border",
  IN_PROGRESS: "bg-info-soft text-info-content border-border",
  IN_REVIEW: "bg-info-soft text-info-content border-border",
  DONE: "bg-success-soft text-success-content border-border",
  CANCELLED: "bg-destructive-soft text-destructive-content border-border",
};

const priorityBadgeStyles: Record<string, string> = {
  URGENT: "bg-destructive-soft text-destructive-content font-semibold",
  HIGH: "bg-warning-soft text-warning-content font-semibold",
  MEDIUM: "bg-info-soft text-info-content font-medium",
  LOW: "bg-muted text-muted-foreground font-medium",
};

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
      taskId,
      projectId: propProjectId || "",
      status: "",
      priority: "",
      dueDate: "",
      tag: taskId ? `[Task #${taskId.slice(0, 8)}]` : "",
    };
  }, [content, propProjectId]);

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

        <div className="flex flex-wrap items-center gap-2">
          {parsed.status && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${
                statusBadgeStyles[parsed.status] || "bg-muted text-foreground border-border"
              }`}
            >
              {parsed.status.replace("_", " ")}
            </span>
          )}

          {parsed.priority && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs uppercase ${
                priorityBadgeStyles[parsed.priority] || "bg-muted text-muted-foreground"
              }`}
            >
              <AlertCircle size={11} />
              {parsed.priority}
            </span>
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
        </div>
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
          <Link
            href={targetUrl}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-panel bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:bg-success transition-colors cursor-pointer",
              isThread && "min-h-9 w-full justify-center whitespace-nowrap rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
            )}
          >
            <span>View Task Detail</span>
            <ExternalLink size={12} className={isThread ? "shrink-0" : undefined} />
          </Link>
        </div>
      )}
    </div>
  );
}

