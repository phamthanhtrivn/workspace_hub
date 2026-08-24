"use client";

import {
  TaskStatus,
  TaskPriority,
  ProjectStatus,
} from "@/features/project/types/project";
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
  Ban,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

// ─── Task Status ──────────────────────────────────────────────────────────────

const taskStatusConfig: Record<
  TaskStatus,
  { labelId: string; color: string; bg: string; icon: React.ElementType }
> = {
  [TaskStatus.TODO]: {
    labelId: "project.task.status.todo",
    color: "text-slate-500",
    bg: "bg-slate-100",
    icon: Circle,
  },
  [TaskStatus.IN_PROGRESS]: {
    labelId: "project.task.status.inProgress",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Loader2,
  },
  [TaskStatus.IN_REVIEW]: {
    labelId: "project.task.status.inReview",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: Eye,
  },
  [TaskStatus.DONE]: {
    labelId: "project.task.status.done",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: CheckCircle2,
  },
  [TaskStatus.CANCELLED]: {
    labelId: "project.task.status.cancelled",
    color: "text-slate-600",
    bg: "bg-slate-200",
    icon: Ban,
  },
};

// ─── Task Priority ────────────────────────────────────────────────────────────

const taskPriorityConfig: Record<
  TaskPriority,
  { labelId: string; color: string; bg: string; icon: React.ElementType }
> = {
  [TaskPriority.LOW]: {
    labelId: "project.task.priority.low",
    color: "text-slate-500",
    bg: "bg-slate-100",
    icon: ArrowDown,
  },
  [TaskPriority.MEDIUM]: {
    labelId: "project.task.priority.medium",
    color: "text-sky-600",
    bg: "bg-sky-50",
    icon: ArrowRight,
  },
  [TaskPriority.HIGH]: {
    labelId: "project.task.priority.high",
    color: "text-orange-600",
    bg: "bg-orange-50",
    icon: ArrowUp,
  },
  [TaskPriority.URGENT]: {
    labelId: "project.task.priority.urgent",
    color: "text-red-600",
    bg: "bg-red-50",
    icon: Flame,
  },
};

// ─── Project Status ───────────────────────────────────────────────────────────

const projectStatusConfig: Record<
  ProjectStatus,
  { labelId: string; color: string; bg: string; icon: React.ElementType }
> = {
  [ProjectStatus.ACTIVE]: {
    labelId: "project.status.active",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: Loader2,
  },
  [ProjectStatus.ON_HOLD]: {
    labelId: "project.status.onHold",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: Pause,
  },
  [ProjectStatus.COMPLETED]: {
    labelId: "project.status.completed",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: CheckCircle2,
  },
  [ProjectStatus.ARCHIVED]: {
    labelId: "project.status.archived",
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
  const intl = useAppIntl();
  const cfg = taskStatusConfig[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${compact ? "rounded-[3px] px-1.5 py-0.5 text-[10px]" : "rounded-full px-2.5 py-1 text-xs"} font-bold ${cfg.bg} ${cfg.color}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {intl.formatMessage({ id: cfg.labelId })}
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
  const intl = useAppIntl();
  const cfg = taskPriorityConfig[priority];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${compact ? "rounded-[3px] px-1 py-0.5 text-[10px]" : "rounded-full px-2.5 py-1 text-xs"} font-bold ${cfg.bg} ${cfg.color}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {intl.formatMessage({ id: cfg.labelId })}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const intl = useAppIntl();
  const cfg = projectStatusConfig[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cfg.bg} ${cfg.color}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {intl.formatMessage({ id: cfg.labelId })}
    </span>
  );
}

export function LabelBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}
