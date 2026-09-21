"use client";

import React from "react";
import {
  TaskStatus,
  ProjectStatus,
} from "@/features/project/types/project";
import {
  Circle,
  Loader2,
  Eye,
  CheckCircle2,
  Pause,
  Archive,
  Ban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Task Status ──────────────────────────────────────────────────────────────

const taskStatusConfig: Record<
  TaskStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  [TaskStatus.TODO]: {
    label: "To Do",
    color: "text-slate-600",
    bg: "bg-slate-100 border-slate-200",
    icon: Circle,
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "In Progress",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: Loader2,
  },
  [TaskStatus.IN_REVIEW]: {
    label: "In Review",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Eye,
  },
  [TaskStatus.DONE]: {
    label: "Done",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
  },
  [TaskStatus.CANCELLED]: {
    label: "Cancelled",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
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
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: Loader2,
  },
  [ProjectStatus.ON_HOLD]: {
    label: "On Hold",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Pause,
  },
  [ProjectStatus.COMPLETED]: {
    label: "Completed",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: CheckCircle2,
  },
  [ProjectStatus.ARCHIVED]: {
    label: "Archived",
    color: "text-slate-600",
    bg: "bg-slate-100 border-slate-200",
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
        "inline-flex items-center gap-1.5 font-bold transition-all",
        compact ? "rounded-md px-1.5 py-0.5 text-[10px]" : "rounded-full px-2.5 py-0.5 text-xs",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold transition-all",
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
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1.5 rounded-full border-transparent px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs"
      style={{ backgroundColor: color }}
    >
      {name}
    </Badge>
  );
}
