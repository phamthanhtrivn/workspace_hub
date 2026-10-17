"use client";

import React from "react";
import {
  TaskStatus,
  ProjectStatus,
  TaskPriority,
} from "@/features/project/types/project";
import {
  Circle,
  Loader2,
  Eye,
  CheckCircle2,
  Pause,
  Archive,
  Ban,
  ChevronsUp,
  ChevronUp,
  Equal,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CustomBadge } from "@/components/ui/custom/custom-badge";
import { cn } from "@/lib/utils";
import { readableTextOnColor } from "@/lib/color";

// ─── Task Status ──────────────────────────────────────────────────────────────

const taskStatusConfig: Record<
  TaskStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  [TaskStatus.TODO]: {
    label: "To Do",
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
    icon: Circle,
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "In Progress",
    color: "text-info",
    bg: "bg-info-soft border-border",
    icon: Loader2,
  },
  [TaskStatus.IN_REVIEW]: {
    label: "In Review",
    color: "text-warning",
    bg: "bg-warning-soft border-border",
    icon: Eye,
  },
  [TaskStatus.DONE]: {
    label: "Done",
    color: "text-success",
    bg: "bg-success-soft border-border",
    icon: CheckCircle2,
  },
  [TaskStatus.CANCELLED]: {
    label: "Cancelled",
    color: "text-destructive",
    bg: "bg-destructive-soft border-border",
    icon: Ban,
  },
};

// ─── Project Status ───────────────────────────────────────────────────────────

const projectStatusConfig: Record<
  ProjectStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  [ProjectStatus.ACTIVE]: {
    label: "Active",
    color: "text-success",
    bg: "bg-success-soft border-border",
    icon: Loader2,
  },
  [ProjectStatus.ON_HOLD]: {
    label: "On Hold",
    color: "text-warning",
    bg: "bg-warning-soft border-border",
    icon: Pause,
  },
  [ProjectStatus.COMPLETED]: {
    label: "Completed",
    color: "text-info",
    bg: "bg-info-soft border-border",
    icon: CheckCircle2,
  },
  [ProjectStatus.ARCHIVED]: {
    label: "Archived",
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
    icon: Archive,
  },
};

// ─── Components ───────────────────────────────────────────────────────────────

export function TaskStatusBadge({
  status,
  compact = false,
}: {
  status: TaskStatus;
  compact?: boolean;
}) {
  const cfg = taskStatusConfig[status] || taskStatusConfig[TaskStatus.TODO];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold transition-all",
        compact ? "rounded-md px-1.5 py-0.5 text-xs" : "rounded-full px-2.5 py-0.5 text-xs",
        cfg.bg,
        cfg.color
      )}
    >
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
      {cfg.label}
    </Badge>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = projectStatusConfig[status] || projectStatusConfig[ProjectStatus.ACTIVE];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all",
        cfg.bg,
        cfg.color
      )}
    >
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
      {cfg.label}
    </Badge>
  );
}

// ─── Task Priority ────────────────────────────────────────────────────────────

const taskPriorityConfig: Record<
  TaskPriority,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  [TaskPriority.URGENT]: {
    label: "Urgent",
    color: "text-destructive",
    bg: "bg-destructive-soft border-border",
    icon: ChevronsUp,
  },
  [TaskPriority.HIGH]: {
    label: "High",
    color: "text-warning",
    bg: "bg-warning-soft border-border",
    icon: ChevronUp,
  },
  [TaskPriority.MEDIUM]: {
    label: "Medium",
    color: "text-info",
    bg: "bg-info-soft border-border",
    icon: Equal,
  },
  [TaskPriority.LOW]: {
    label: "Low",
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
    icon: ChevronDown,
  },
};

export function TaskPriorityBadge({
  priority,
  compact = false,
}: {
  priority: TaskPriority;
  compact?: boolean;
}) {
  const cfg = taskPriorityConfig[priority] || taskPriorityConfig[TaskPriority.LOW];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold transition-all",
        compact ? "rounded-md px-1.5 py-0.5 text-xs" : "rounded-full px-2.5 py-0.5 text-xs",
        cfg.bg,
        cfg.color
      )}
    >
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
      {cfg.label}
    </Badge>
  );
}

export function LabelBadge({ name, color }: { name: string; color: string }) {
  return (
    <CustomBadge
      variantStyle="label"
      style={{ backgroundColor: color, color: readableTextOnColor(color) }}
    >
      {name}
    </CustomBadge>
  );
}
