import { KAFKA_EVENTS } from "../constants/kafka.constants";
import type { ProjectNotification } from "../adapters/project-communication.port";

type TaskNotificationType =
  | typeof KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED
  | typeof KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UNASSIGNED
  | typeof KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_DELETED
  | typeof KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UPDATED;

export function isTaskNotification(type: string): type is TaskNotificationType {
  return (
    type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED ||
    type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UNASSIGNED ||
    type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_DELETED ||
    type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UPDATED
  );
}

export function taskNotificationContent(
  type: TaskNotificationType,
  metadata: Record<string, unknown>,
  senderName = "A project member",
): string | undefined {
  const { taskTitle, taskNumber, projectName } = metadata;
  if (
    typeof taskTitle !== "string" ||
    typeof projectName !== "string" ||
    !Number.isSafeInteger(taskNumber) ||
    Number(taskNumber) < 1
  )
    return undefined;
  const task = `TASK-${taskNumber} "${taskTitle}"`;
  if (metadata.activityKind === 'COMMENT') {
    const changes = Array.isArray(metadata.changes) ? metadata.changes : [];
    const field = (changes[0] as { field?: string } | undefined)?.field;
    return `${senderName} ${field === 'comment_created' ? 'added' : field === 'comment_updated' ? 'edited' : 'deleted'} a comment in ${task} in project "${projectName}".`;
  }
  if (type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UNASSIGNED)
    return `${senderName} removed you from ${task} in project "${projectName}".`;
  if (type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_DELETED)
    return `${senderName} deleted ${task} in project "${projectName}".`;
  const changes = Array.isArray(metadata.changes) ? metadata.changes as Array<{ field?: string; after?: unknown }> : [];
  if (changes.some((change) => change.field === 'created') && type !== KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED)
    return `${senderName} created ${task} in project "${projectName}".`;
  return type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED
    ? `${senderName} assigned ${task} to you in project "${projectName}".`
    : `${senderName} updated ${task} in project "${projectName}".`;
}

export function buildTaskNotification(input: {
  type: TaskNotificationType;
  recipientId: string;
  senderId: string;
  project: { id: string; name: string };
  task: { id: string; title: string; taskNumber: number };
}): ProjectNotification {
  const { type, recipientId, senderId, project, task } = input;
  const metadata = {
    taskId: task.id,
    projectId: project.id,
    projectName: project.name,
    taskTitle: task.title,
    taskNumber: task.taskNumber,
  };
  return {
    recipientId,
    senderId,
    type,
    title:
      type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED
        ? "You were assigned a task"
        : type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UNASSIGNED ? 'Task assignment removed'
        : type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_DELETED ? 'Task deleted' : "Task updated",
    content: taskNotificationContent(type, metadata)!,
    link: type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_DELETED ? `/projects/${project.id}` : `/projects/${project.id}?taskId=${task.id}`,
    metadata,
  };
}
