"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardCompletedTasks } from "../api/dashboard.api";
import { COMPLETED_TASKS_STALE_TIME, dashboardAnalyticsKeys } from "../constants/dashboard-analytics";

export function useDashboardCompletedTasks(userId: string | null) {
  return useQuery({
    queryKey: dashboardAnalyticsKeys.completedTasks(userId),
    queryFn: () => getDashboardCompletedTasks(userId!),
    enabled: Boolean(userId),
    staleTime: COMPLETED_TASKS_STALE_TIME,
  });
}
