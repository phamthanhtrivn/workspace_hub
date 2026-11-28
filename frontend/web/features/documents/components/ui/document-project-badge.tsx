"use client";

import { FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProject } from "@/features/project/hooks/use-projects";
import { getProjectColorStyle } from "@/features/project/utils/project-color.utils";

interface DocumentProjectBadgeProps {
  projectId: string;
  className?: string;
}

export function DocumentProjectBadge({
  projectId,
  className,
}: DocumentProjectBadgeProps) {
  const projectQuery = useProject(projectId);
  const project = projectQuery.data;
  const label = project?.name ? `Project: ${project.name}` : "Project";

  return (
    <Badge
      variant="outline"
      aria-busy={projectQuery.isPending || undefined}
      title={
        project
          ? label
          : projectQuery.isPending
            ? "Loading project details..."
            : "Project details unavailable"
      }
      style={getProjectColorStyle(project?.color)}
      className={cn(
        "min-w-0 max-w-full justify-start gap-1.5 border-[color-mix(in_srgb,var(--project-color)_45%,var(--border))] bg-[color-mix(in_srgb,var(--project-color)_12%,var(--card))] text-foreground",
        className,
      )}
    >
      <FolderKanban
        aria-hidden="true"
        className="size-3 shrink-0 text-[color-mix(in_srgb,var(--project-color)_70%,var(--foreground))]"
      />
      <span className="min-w-0 truncate">{label}</span>
    </Badge>
  );
}
