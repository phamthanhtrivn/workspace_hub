import type { CompletionPeriod } from "../types/dashboard-analytics.types";

export const COMPLETION_PERIODS: readonly CompletionPeriod[] = [7, 30];
export const DEFAULT_COMPLETION_PERIOD: CompletionPeriod = 30;
export const MAX_WORKLOAD_PROJECTS = 5;
export const COMPLETED_TASKS_STALE_TIME = 60_000;

export const dashboardAnalyticsKeys = {
  completedTasks: (userId: string | null) =>
    ["projects", "dashboard-completed-tasks", userId] as const,
};

export const TASK_DEADLINE_CATEGORIES = [
  { bucket: "Overdue", label: "Overdue", fill: "var(--destructive-content)" },
  { bucket: "Today", label: "Due today", fill: "var(--warning-content)" },
  { bucket: "Upcoming", label: "Upcoming", fill: "var(--chart-1)" },
  { bucket: "No deadline", label: "No deadline", fill: "var(--chart-2)" },
] as const;

export const WORKLOAD_SERIES = [
  { key: "overdue", label: "Overdue", fill: "var(--destructive-content)" },
  { key: "remaining", label: "Other open tasks", fill: "var(--chart-1)" },
] as const;

