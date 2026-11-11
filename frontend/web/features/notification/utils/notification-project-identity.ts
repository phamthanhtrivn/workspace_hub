import type { AccessibleProjectIdentity } from "@/features/project/api/project.api";
import { isProjectResourceId } from "@/features/project/utils/project-task-link";
import type { Notification } from "../types/notification.types";

export type NotificationProjectContext = Pick<
  Notification,
  "metadata" | "recipientId"
>;

export function getNotificationProjectIdentity(
  notification: NotificationProjectContext,
  current?: AccessibleProjectIdentity | null,
) {
  const metadata = notification.metadata ?? {};
  const projectId =
    typeof metadata.projectId === "string" &&
    isProjectResourceId(metadata.projectId)
      ? metadata.projectId
      : undefined;
  const project = projectId && current?.id === projectId ? current : undefined;
  const savedIcon =
    typeof metadata.projectIcon === "string"
      ? metadata.projectIcon.trim()
      : undefined;
  const savedColor =
    typeof metadata.projectColor === "string"
      ? metadata.projectColor
      : undefined;

  return {
    projectId,
    projectName:
      project?.name ??
      (typeof metadata.projectName === "string"
        ? metadata.projectName
        : undefined),
    // An explicitly cleared current icon must not revive a historical icon.
    projectIcon: project ? project.icon?.trim() || undefined : savedIcon,
    projectColor: project ? project.color : savedColor,
  };
}
