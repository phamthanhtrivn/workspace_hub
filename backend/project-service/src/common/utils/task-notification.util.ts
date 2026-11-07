import { KAFKA_EVENTS } from "../constants/kafka.constants";
import type { ProjectNotification } from "../adapters/project-communication.port";

type TaskNotificationType =
  | typeof KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED
  | typeof KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UPDATED;

export function isTaskNotification(type: string): type is TaskNotificationType {
  return (
    type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED ||
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
        : "Task updated",
    content: taskNotificationContent(type, metadata)!,
    link: `/projects/${project.id}?taskId=${task.id}`,
    metadata,
  };
}
