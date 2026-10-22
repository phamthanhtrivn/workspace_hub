"use client";

import { cn } from "@/lib/utils";
import { ProjectColorDot, ProjectIdentityIcon } from "./project-identity";

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
        <ProjectIdentityIcon icon={icon} color={color} />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <ProjectColorDot color={color} />
            <span className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </span>
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
