"use client";

import { useMemo } from "react";
import { CheckSquare, ExternalLink, FolderGit2, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/date";

interface TaskCardMessageProps {
  content: string;
  projectId?: string | null;
  className?: string;
}

const statusBadgeStyles: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  IN_REVIEW: "bg-purple-50 text-purple-700 border-purple-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

const priorityBadgeStyles: Record<string, string> = {
  URGENT: "bg-rose-100 text-rose-800 font-bold",
  HIGH: "bg-amber-100 text-amber-800 font-bold",
  MEDIUM: "bg-blue-100 text-blue-800 font-medium",
  LOW: "bg-slate-100 text-slate-600 font-medium",
};

export default function TaskCardMessage({
  content,
  projectId: propProjectId,
  className = "",
}: TaskCardMessageProps) {
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
      className={`w-full max-w-md rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-white p-4 shadow-[0_4px_16px_-4px_rgba(16,185,129,0.12)] transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-emerald-100/70 pb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <CheckSquare size={13} />
          </div>
          <span className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">
            Task Card
          </span>
        </div>
        {parsed.tag && (
          <span className="rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-800">
            {parsed.tag}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <h4 className="text-sm font-bold text-slate-900 leading-snug">
          {parsed.title}
        </h4>

        <div className="flex flex-wrap items-center gap-2">
          {parsed.status && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                statusBadgeStyles[parsed.status] || "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {parsed.status.replace("_", " ")}
            </span>
          )}

          {parsed.priority && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] uppercase ${
                priorityBadgeStyles[parsed.priority] || "bg-slate-100 text-slate-600"
              }`}
            >
              <AlertCircle size={11} />
              {parsed.priority}
            </span>
          )}

          {parsed.dueDate && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <Clock size={12} className="text-slate-400" />
              <span>Due: {formatDateTime(parsed.dueDate)}</span>
            </span>
          )}
        </div>
      </div>

      {targetUrl && (
        <div className="mt-3.5 flex items-center justify-between gap-2 pt-2.5 border-t border-emerald-100/70">
          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <FolderGit2 size={12} className="text-emerald-600" />
            <span>Project Task</span>
          </span>
          <Link
            href={targetUrl}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
          >
            <span>View Task Detail</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

