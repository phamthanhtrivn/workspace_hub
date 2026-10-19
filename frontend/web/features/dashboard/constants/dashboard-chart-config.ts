import type { ChartConfig } from "@/components/ui/chart";
import { TASK_DEADLINE_CATEGORIES, WORKLOAD_SERIES } from "./dashboard-analytics";

export const DEADLINE_CHART_CONFIG = Object.fromEntries(
  TASK_DEADLINE_CATEGORIES.map((category, index) => [
    `deadline${index}`, { label: category.label, color: category.fill },
  ]),
) satisfies ChartConfig;

export const COMPLETION_CHART_CONFIG = {
  count: { label: "Completed tasks", color: "var(--chart-1)" },
} satisfies ChartConfig;

export const WORKLOAD_CHART_CONFIG = Object.fromEntries(
  WORKLOAD_SERIES.map((series) => [series.key, { label: series.label, color: series.fill }]),
) satisfies ChartConfig;
