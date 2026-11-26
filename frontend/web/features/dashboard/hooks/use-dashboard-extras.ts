"use client";

import { useEffect } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { getProjects } from "@/features/project/api/project.api";
import { getProjectTaskStatusCounts } from "@/features/project/api/task.api";
import { ProjectStatus } from "@/features/project/types/project";
import { getNotifications } from "@/features/notification/api/notification.api";
import { notificationKeys } from "@/features/notification/hooks/use-notification-actions";
import { NOTIFICATION_CHANGED_EVENT } from "@/features/notification/utils/notification-category.utils";
import { taskKeys } from "@/features/project/hooks/use-tasks";
import { notebooksApi } from "@/features/ai/api/notebooks.api";
import { notebookKeys } from "@/features/ai/types/notebook-list";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DocumentSortBy } from "@/features/documents/types/documents.enums";
import { getDailyStats } from "@/features/pomodoro/api/pomodoro-server.api";
import { localDateKey } from "@/features/pomodoro/utils/pomodoro-report";

export function useDashboardExtras(userId: string | null, timeZone = "UTC") {
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries(
        { queryKey: notificationKeys.root },
        { cancelRefetch: false },
      );
    };
    window.addEventListener(NOTIFICATION_CHANGED_EVENT, refresh);

    return () =>
      window.removeEventListener(NOTIFICATION_CHANGED_EVENT, refresh);
  }, [queryClient]);
  const enabled = Boolean(userId);
  const projects = useQuery({
    queryKey: ["projects", "dashboard-active", userId],
    queryFn: () =>
      getProjects({ page: 1, limit: 3, status: ProjectStatus.ACTIVE }),
    enabled,
    staleTime: 30_000,
  });
  const counts = useQueries({
    queries: (projects.data?.data || [])
      .filter((project) => !project.archived)
      .slice(0, 3)
      .map((project) => ({
        queryKey: [...taskKeys.statusCounts(project.id), userId],
        queryFn: () => getProjectTaskStatusCounts(project.id),
        staleTime: 30_000,
      })),
  });
  const notifications = useQuery({
    queryKey: [...notificationKeys.lists(), "dashboard", userId],
    queryFn: () => getNotifications(1, 5),
    enabled,
    staleTime: 30_000,
  });
  const notebooks = useQuery({
    queryKey: notebookKeys.list(userId ?? "", {
      page: 1,
      search: "",
      sort: "updated_desc",
    }),
    queryFn: ({ signal }) =>
      notebooksApi.page({ page: 1, search: "", sort: "updated_desc" }, signal),
    enabled,
    staleTime: 30_000,
  });
  const documents = useQuery({
    queryKey: ["documents", "dashboard-recent", userId],
    queryFn: ({ signal }) =>
      documentsApi.getDocuments(
        { page: 1, limit: 4, sortBy: DocumentSortBy.LATEST },
        signal,
      ),
    enabled,
    staleTime: 30_000,
  });
  const documentQuota = useQuery({
    queryKey: ["document-quota", "dashboard", userId],
    queryFn: () => documentsApi.getQuota(),
    enabled,
    staleTime: 30_000,
  });
  const pomodoroStats = useQuery({
    queryKey: [
      "pomodoro",
      "daily-stats",
      userId,
      timeZone,
      localDateKey(new Date(), timeZone),
    ],
    queryFn: () => getDailyStats(timeZone),
    enabled,
    staleTime: 30_000,
  });

  return {
    projects,
    counts,
    notifications,
    notebooks,
    documents,
    documentQuota,
    pomodoroStats,
  };
}
