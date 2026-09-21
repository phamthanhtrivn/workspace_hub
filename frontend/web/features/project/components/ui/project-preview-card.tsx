"use client";

import { FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectPreviewCardProps {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  fallbackName?: string;
  className?: string;
}

export default function ProjectPreviewCard({
  name,
  description,
  icon,
  color = "#0052CC",
  fallbackName = "Untitled Project",
  className,
}: ProjectPreviewCardProps) {
  const displayName = name?.trim() || fallbackName;
  const displayDescription = description?.trim();

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-slate-50 p-4",
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Preview
      </p>
      <div className="mt-2 flex min-w-0 items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg shadow-sm"
          style={{
            backgroundColor: `${color}14`,
            boxShadow: `0 0 0 1px ${color}66`,
            color,
          }}
          aria-hidden="true"
        >
          {icon || <FolderKanban className="h-5 w-5" strokeWidth={2} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-[#172B4D]">
            {displayName}
          </span>
          {displayDescription ? (
            <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
              {displayDescription}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
