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
    notification.type === NotificationType.PROJECT_TASK_UNASSIGNED ||
    notification.type === NotificationType.PROJECT_TASK_DELETED ||
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
  if (metadata && notification.type === NotificationType.PROJECT_TASK_DELETED) return `/projects/${metadata.projectId}`;
  return metadata ? getProjectTaskLink(metadata.projectId, metadata.taskId) : undefined;
}

export function projectTaskNotificationHeading(notification: Notification, senderName: string): string {
  if (notification.metadata?.activityKind === 'COMMENT') {
    const field = Array.isArray(notification.metadata.changes) ? notification.metadata.changes[0]?.field : undefined;
    return `${senderName} ${field === 'comment_created' ? 'commented in a task' : field === 'comment_deleted' ? 'deleted a comment in a task' : 'edited a comment in a task'}`;
  }
  if (notification.type === NotificationType.PROJECT_TASK_UNASSIGNED) return `${senderName} removed your task assignment`;
  if (notification.type === NotificationType.PROJECT_TASK_DELETED) return `${senderName} deleted a task`;
  const changes = Array.isArray(notification.metadata?.changes) ? notification.metadata.changes : [];
  if (changes.some((change: { field?: string }) => change.field === 'created') && notification.type !== NotificationType.PROJECT_TASK_ASSIGNED) return `${senderName} created a task`;
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
