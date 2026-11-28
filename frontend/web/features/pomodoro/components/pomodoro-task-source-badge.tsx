"use client";

import { CalendarDays, FolderKanban } from "lucide-react";
import { useProject } from "@/features/project/hooks/use-projects";
import type { Project } from "@/features/project/types/project";
import { readableTextOnColor } from "@/lib/color";
import { cn } from "@/lib/utils";
import type { PomodoroActiveTask } from "../types/pomodoro";

type FocusSource = Pick<PomodoroActiveTask, "projectId" | "calendarEventId" | "projectName" | "projectColor">;
type ProjectIdentity = Pick<Project, "name" | "icon" | "color">;

const badgeClass = "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium";

function ProjectSourceBadge({ task, project, inverse }: { task: FocusSource; project?: ProjectIdentity; inverse: boolean }) {
  const query = useProject(project ? "" : task.projectId!);
  const identity = project ?? query.data;
  const name = identity?.name || task.projectName || (query.isPending ? "Loading project..." : "Project unavailable");
  const color = identity?.color || task.projectColor;
  return <span title={`Project (${name})`}
    style={color ? { backgroundColor: color, color: readableTextOnColor(color) } : undefined}
    className={cn(badgeClass, !color && "bg-muted text-foreground", inverse && "ring-1 ring-inset ring-primary-foreground/25")}>
    <FolderKanban aria-hidden="true" className="size-3.5 shrink-0" />
    <span className="truncate">Project ({name})</span>
  </span>;
}

export function PomodoroTaskSourceBadge({ task, project, inverse = false }: {
  task: FocusSource;
  project?: ProjectIdentity;
  inverse?: boolean;
}) {
  if (task.projectId) return <ProjectSourceBadge task={task} project={project} inverse={inverse} />;
  if (!task.calendarEventId) return null;
  return <span className={cn(badgeClass, "bg-primary text-primary-foreground", inverse && "ring-1 ring-inset ring-primary-foreground/25")}>
    <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />Calendar
  </span>;
}
