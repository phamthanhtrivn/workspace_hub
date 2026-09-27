"use client";

import { useMemo } from "react";
import { CheckSquare } from "lucide-react";

export interface ThreadSnippet {
  isTask: boolean;
  title: string;
  tag?: string;
}

export function formatThreadSnippet(content: string | undefined | null): ThreadSnippet {
  if (!content || !content.trim()) {
    return { isTask: false, title: "Attachment" };
  }

  const trimmed = content.trim();

  // 1. Try parsing JSON format
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const json = JSON.parse(trimmed);
      if (json.title || json.taskId) {
        return {
          isTask: true,
          title: json.title || "Task Discussion",
          tag: json.tag || (json.taskId ? `[Task #${json.taskId.slice(0, 8)}]` : ""),
        };
      }
    } catch {
      // ignore
    }
  }

  // 2. Try matching legacy text format with [Task #...]
  if (content.includes("[Task #")) {
    const match = content.match(/\[Task #([a-f0-9-]+)\]/i);
    const tag = match ? `[Task #${match[1].slice(0, 8)}]` : "";
    const title = content
      .replace(/📋 Discussion Thread:\s*/i, "")
      .replace(/\[Task #[^\]]+\]/i, "")
      .trim();
    return {
      isTask: true,
      title: title || "Task Discussion Thread",
      tag,
    };
  }

  return { isTask: false, title: content };
}

export default function ThreadSnippetPreview({
  content,
  className = "",
}: {
  content: string | undefined | null;
  className?: string;
}) {
  const snippet = useMemo(() => formatThreadSnippet(content), [content]);

  if (snippet.isTask) {
    return (
      <div
        className={`flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-blue-50/90 border border-blue-100 rounded-lg px-2.5 py-1.5 my-0.5 ${className}`}
      >
        <CheckSquare size={13} className="text-blue-600 shrink-0" />
        <span className="truncate">{snippet.title}</span>
        {snippet.tag && (
          <span className="ml-auto text-[10px] font-mono bg-blue-100/90 text-blue-800 px-1.5 py-0.2 rounded font-semibold shrink-0">
            {snippet.tag}
          </span>
        )}
      </div>
    );
  }

  return (
    <span className={`block text-xs text-slate-600 line-clamp-2 break-words ${className}`}>
      {snippet.title}
    </span>
  );
}
