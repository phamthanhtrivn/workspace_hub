import { TaskPriority, TaskStatus } from "../types/project";

// Header and rows share tracks; the minimum width includes 32px horizontal padding.
export const BACKLOG_LAYOUT = {
  columns: "grid-cols-[minmax(240px,1fr)_120px_110px_72px_72px_96px]",
  minWidth: "min-w-[742px]",
} as const;

export const TASK_STATUS_OPTIONS = [
  { value: TaskStatus.TODO, label: "To Do" },
  { value: TaskStatus.IN_PROGRESS, label: "In Progress" },
  { value: TaskStatus.IN_REVIEW, label: "In Review" },
  { value: TaskStatus.DONE, label: "Done" },
  { value: TaskStatus.CANCELLED, label: "Cancelled" },
] as const;

export const TASK_STATUS_SELECT_OPTIONS = TASK_STATUS_OPTIONS;

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: "Urgent",
  [TaskPriority.HIGH]: "High",
  [TaskPriority.MEDIUM]: "Medium",
  [TaskPriority.LOW]: "Low",
};

export const TASK_PRIORITY_OPTIONS = [
  { value: TaskPriority.LOW, label: "Low" },
  { value: TaskPriority.MEDIUM, label: "Medium" },
  { value: TaskPriority.HIGH, label: "High" },
  { value: TaskPriority.URGENT, label: "Urgent" },
] as const;

export const TASK_DRAWER_STATUS_OPTIONS = [
  { value: TaskStatus.TODO, label: "To Do", color: "text-muted-foreground bg-muted hover:bg-accent" },
  { value: TaskStatus.IN_PROGRESS, label: "In Progress", color: "text-info bg-primary-soft hover:bg-accent" },
  { value: TaskStatus.IN_REVIEW, label: "In Review", color: "text-warning bg-warning-soft hover:bg-warning-soft" },
  { value: TaskStatus.DONE, label: "Done", color: "text-success bg-success-soft hover:bg-success-soft" },
  { value: TaskStatus.CANCELLED, label: "Cancelled", color: "text-destructive bg-destructive-soft hover:bg-destructive-soft border border-border" },
] as const;

export const TASK_PRIORITY_SELECT_OPTIONS = TASK_PRIORITY_OPTIONS;
export const TASK_DRAWER_PRIORITY_OPTIONS = TASK_PRIORITY_OPTIONS;

export const TASK_STATUS_CHART_CONFIG = [
  { status: TaskStatus.TODO, label: "To Do", color: "var(--info)" },
  { status: TaskStatus.IN_PROGRESS, label: "In Progress", color: "var(--primary)" },
  { status: TaskStatus.IN_REVIEW, label: "In Review", color: "var(--warning)" },
  { status: TaskStatus.DONE, label: "Done", color: "var(--success)" },
  { status: TaskStatus.CANCELLED, label: "Cancelled", color: "var(--destructive)" },
] as const;

export const TASK_PRIORITY_CHART_CONFIG = [
  { priority: TaskPriority.URGENT, label: "Urgent", color: "bg-destructive" },
  { priority: TaskPriority.HIGH, label: "High", color: "bg-warning" },
  { priority: TaskPriority.MEDIUM, label: "Medium", color: "bg-primary" },
  { priority: TaskPriority.LOW, label: "Low", color: "bg-muted-foreground" },
] as const;

export const GANTT_STATUS_LEGEND = [
  { status: TaskStatus.TODO, label: "To Do", color: "bg-muted-foreground" },
  { status: TaskStatus.IN_PROGRESS, label: "In Progress", color: "bg-primary" },
  { status: TaskStatus.IN_REVIEW, label: "In Review", color: "bg-warning" },
  { status: TaskStatus.DONE, label: "Done", color: "bg-success" },
  { status: TaskStatus.CANCELLED, label: "Cancelled", color: "bg-destructive" },
] as const;
