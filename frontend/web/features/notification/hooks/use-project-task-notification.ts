"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { getUserProfiles } from "@/features/project/api/project.api";
import { getTask } from "@/features/project/api/task.api";
import type { Notification } from "../types/notification.types";
import { getProjectTaskNotificationMetadata } from "../utils/project-task-notification.utils";
import { useNotificationProject } from "./use-notification-project";

const CONTEXT_STALE_TIME_MS = 5 * 60 * 1_000;

/** Old notifications resolve missing context through the normal, permission-checked APIs. */
export function useProjectTaskNotification(notification: Notification) {
  const metadata = getProjectTaskNotificationMetadata(notification);
  const project = useNotificationProject(notification);
  const viewerId = useAppSelector(state => state.auth.userId);
  const hasToken = useAppSelector(state => Boolean(state.auth.accessToken));
  const enabled = Boolean(hasToken && viewerId === notification.recipientId && metadata);
  const senderId = notification.senderId;
  const taskQuery = useQuery({
    queryKey: ["notifications", "task-context", viewerId, metadata?.projectId, metadata?.taskId],
    queryFn: async () => {
      const task = await getTask(metadata!.taskId);
      if (task.projectId !== metadata!.projectId) throw new Error("Task does not belong to this project");
      return task;
    },
    enabled: enabled && (!metadata?.taskTitle || !metadata?.taskNumber),
    staleTime: CONTEXT_STALE_TIME_MS,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const senderQuery = useQuery({
    queryKey: ["notifications", "sender-context", viewerId, senderId],
    queryFn: async () => (await getUserProfiles([senderId!])).get(senderId!),
    enabled: enabled && Boolean(senderId && !notification.senderName),
    staleTime: CONTEXT_STALE_TIME_MS,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    senderName: notification.senderName || senderQuery.data?.fullName || senderQuery.data?.email || "A project member",
    senderAvatar: senderQuery.data ? senderQuery.data.avatarUrl : notification.senderAvatar,
    projectName: project.projectName || metadata?.projectName,
    taskTitle: metadata?.taskTitle || taskQuery.data?.title,
    taskNumber: metadata?.taskNumber || taskQuery.data?.taskNumber,
  };
}
