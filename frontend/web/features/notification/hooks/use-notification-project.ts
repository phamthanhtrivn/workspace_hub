"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { getAccessibleProjectIdentity } from "@/features/project/api/project.api";
import { projectKeys } from "@/features/project/hooks/use-projects";
import {
  getNotificationProjectIdentity,
  type NotificationProjectContext,
} from "../utils/notification-project-identity";

export function useNotificationProject(
  notification: NotificationProjectContext,
) {
  const { userId, accessToken } = useAppSelector((state) => state.auth);
  const saved = getNotificationProjectIdentity(notification);
  const enabled = Boolean(
    saved.projectId && accessToken && userId === notification.recipientId,
  );
  const project = useQuery({
    queryKey: [
      ...projectKeys.detail(saved.projectId ?? ""),
      "notification-identity",
      userId,
    ],
    queryFn: ({ signal }) =>
      getAccessibleProjectIdentity(saved.projectId!, signal),
    enabled,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
  });

  return getNotificationProjectIdentity(
    notification,
    enabled ? project.data : undefined,
  );
}
