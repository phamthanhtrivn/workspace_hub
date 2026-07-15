"use client";

import { TaskStatus, TaskPriority, ProjectStatus } from "@/types/project";
import {
  Circle,
  Loader2,
  Eye,
  CheckCircle2,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Flame,
  Pause,
  Archive,
} from "lucide-react";

// ─── Task Status ──────────────────────────────────────────────────────────────

const taskStatusConfig: Record<
  TaskStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  [TaskStatus.TODO]: {
    label: "To Do",
    color: "text-slate-500",
    bg: "bg-slate-100",
    icon: Circle,
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "In Progress",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Loader2,
  },
  [TaskStatus.IN_REVIEW]: {
    label: "In Review",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: Eye,
  },
  [TaskStatus.DONE]: {
    label: "Done",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: CheckCircle2,
  },
};

// ─── Task Priority ────────────────────────────────────────────────────────────

const taskPriorityConfig: Record<
  TaskPriority,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  [TaskPriority.LOW]: {
    label: "Low",
    color: "text-slate-500",
    bg: "bg-slate-100",
    icon: ArrowDown,
  },
  [TaskPriority.MEDIUM]: {
    label: "Medium",
    color: "text-sky-600",
    bg: "bg-sky-50",
    icon: ArrowRight,
  },
  [TaskPriority.HIGH]: {
    label: "High",
    color: "text-orange-600",
    bg: "bg-orange-50",
    icon: ArrowUp,
  },
  [TaskPriority.URGENT]: {
    label: "Urgent",
    color: "text-red-600",
    bg: "bg-red-50",
    icon: Flame,
  },
};

// ─── Project Status ───────────────────────────────────────────────────────────

const projectStatusConfig: Record<
  ProjectStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  [ProjectStatus.ACTIVE]: {
    label: "Active",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: Loader2,
  },
  [ProjectStatus.ON_HOLD]: {
    label: "On Hold",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: Pause,
  },
  [ProjectStatus.COMPLETED]: {
    label: "Completed",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: CheckCircle2,
  },
  [ProjectStatus.ARCHIVED]: {
    label: "Archived",
    color: "text-slate-500",
    bg: "bg-slate-100",
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
  const cfg = taskStatusConfig[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${compact ? "rounded-[3px] px-1.5 py-0.5 text-[10px]" : "rounded-full px-2.5 py-1 text-xs"} font-bold ${cfg.bg} ${cfg.color}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

export function TaskPriorityBadge({
  priority,
  compact = false,
}: {
  priority: TaskPriority;
  compact?: boolean;
}) {
  const cfg = taskPriorityConfig[priority];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${compact ? "rounded-[3px] px-1 py-0.5 text-[10px]" : "rounded-full px-2.5 py-1 text-xs"} font-bold ${cfg.bg} ${cfg.color}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = projectStatusConfig[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cfg.bg} ${cfg.color}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

export function LabelBadge({
  name,
  color,
}: {
  name: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}
