"use client";

import { useMemo } from "react";
import { CheckSquare, ExternalLink, FolderGit2 } from "lucide-react";
import Link from "next/link";

interface TaskCardMessageProps {
  content: string;
  projectId?: string | null;
  className?: string;
}

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
      className={`w-full max-w-sm rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 via-indigo-50/30 to-white p-3.5 shadow-[0_4px_16px_-4px_rgba(59,130,246,0.12)] transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-blue-100/70 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0052CC] text-white shadow-xs">
            <CheckSquare size={13} />
          </div>
          <span className="text-[11px] font-bold tracking-wider text-blue-700 uppercase">
            Task
          </span>
        </div>
        {parsed.tag && (
          <span className="rounded-full bg-blue-100/80 px-2 py-0.5 text-[10px] font-mono font-semibold text-blue-800">
            {parsed.tag}
          </span>
        )}
      </div>

      <div className="mt-2.5">
        <h4 className="text-xs font-bold text-slate-900 leading-snug">
          {parsed.title}
        </h4>
      </div>

      {targetUrl && (
        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-blue-100/70">
          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <FolderGit2 size={12} className="text-blue-600" />
            <span>Project Task</span>
          </span>
          <Link
            href={targetUrl}
            className="inline-flex items-center gap-1 rounded-lg bg-[#0052CC] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            <span>View Task Detail</span>
            <ExternalLink size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}
