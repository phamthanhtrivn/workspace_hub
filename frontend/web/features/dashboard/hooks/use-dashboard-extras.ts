"use client";

import { useEffect } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { getProjects } from "@/features/project/api/project.api";
import { getProjectTaskStatusCounts } from "@/features/project/api/task.api";
import { ProjectStatus } from "@/features/project/types/project";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DocumentSortBy } from "@/features/documents/types/documents.enums";
import { getNotifications } from "@/features/notification/api/notification.api";
import { notificationKeys } from "@/features/notification/hooks/use-notification-actions";
import { NOTIFICATION_CHANGED_EVENT } from "@/features/notification/utils/notification-category.utils";
import { taskKeys } from "@/features/project/hooks/use-tasks";

export function useDashboardExtras(userId: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.root });
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
  const documents = useQuery({
    queryKey: ["documents", "dashboard-recent", userId],
    queryFn: () =>
      documentsApi.getDocuments({
        limit: 5,
        page: 1,
        sortBy: DocumentSortBy.LATEST,
      }),
    enabled,
    staleTime: 30_000,
  });
  const notifications = useQuery({
    queryKey: [...notificationKeys.lists(), "dashboard", userId],
    queryFn: () => getNotifications(1, 5),
    enabled,
    staleTime: 30_000,
  });
  return { projects, counts, documents, notifications };
}
