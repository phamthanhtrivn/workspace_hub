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
  color = "var(--primary)",
  fallbackName = "Untitled Project",
  className,
}: ProjectPreviewCardProps) {
  const displayName = name?.trim() || fallbackName;
  const displayDescription = description?.trim();

  return (
    <div
      className={cn(
        "rounded-panel border border-border bg-background p-4",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Preview
      </p>
      <div className="mt-2 flex min-w-0 items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-panel text-lg"
          style={{
            backgroundColor: `${color}14`,
            boxShadow: `0 0 0 1px ${color}66`,
            color: "var(--foreground)",
          }}
          aria-hidden="true"
        >
          {icon || <FolderKanban className="h-5 w-5" strokeWidth={2} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">
            {displayName}
          </span>
          {displayDescription ? (
            <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
              {displayDescription}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
