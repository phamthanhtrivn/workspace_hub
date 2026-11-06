import { NotificationType, type Notification } from "../types/notification.types";
import { getProjectTaskLink, isProjectResourceId } from "../../project/utils/project-task-link";

export interface ProjectTaskNotificationMetadata {
  projectId: string;
  taskId: string;
  projectName?: string;
  taskTitle?: string;
  taskNumber?: number;
}

export function isProjectTaskNotification(notification: Notification): boolean {
  return notification.type === NotificationType.PROJECT_TASK_ASSIGNED ||
    notification.type === NotificationType.PROJECT_TASK_UPDATED;
}

export function getProjectTaskNotificationMetadata(
  notification: Notification,
): ProjectTaskNotificationMetadata | undefined {
  if (!isProjectTaskNotification(notification)) return undefined;
  const metadata = notification.metadata;
  if (!metadata || typeof metadata.projectId !== "string" || typeof metadata.taskId !== "string" ||
    !isProjectResourceId(metadata.projectId) || !isProjectResourceId(metadata.taskId)) return undefined;
  return {
    projectId: metadata.projectId,
    taskId: metadata.taskId,
    projectName: typeof metadata.projectName === "string" ? metadata.projectName.trim() || undefined : undefined,
    taskTitle: typeof metadata.taskTitle === "string" ? metadata.taskTitle.trim() || undefined : undefined,
    taskNumber: typeof metadata.taskNumber === "number" && Number.isSafeInteger(metadata.taskNumber) && metadata.taskNumber > 0
      ? metadata.taskNumber : undefined,
  };
}

export function getProjectTaskNotificationLink(notification: Notification): string | undefined {
  const metadata = getProjectTaskNotificationMetadata(notification);
  return metadata ? getProjectTaskLink(metadata.projectId, metadata.taskId) : undefined;
}

export function projectTaskNotificationHeading(notification: Notification, senderName: string): string {
  return notification.type === NotificationType.PROJECT_TASK_ASSIGNED
    ? `${senderName} assigned a task to you`
    : `${senderName} updated a task`;
}

export function projectTaskNotificationDescription(
  notification: Notification,
  taskTitle?: string,
  taskNumber?: number,
): string {
  if (!taskTitle) return notification.content;
  return taskNumber ? `TASK-${taskNumber} · ${taskTitle}` : taskTitle;
}
