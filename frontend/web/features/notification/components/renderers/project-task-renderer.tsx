"use client";

import { FolderKanban } from "lucide-react";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { useProjectTaskNotification } from "../../hooks/use-project-task-notification";
import { useOpenProjectTaskNotification } from "../../hooks/use-open-project-task-notification";
import { getProjectTaskNotificationLink, projectTaskNotificationDescription, projectTaskNotificationHeading } from "../../utils/project-task-notification.utils";
import type { NotificationListItemProps, NotificationRendererProps } from "../notification-registry";
import { NotificationListRow } from "../notification-list-row";

export function ProjectTaskListItemRenderer({ notification, onClick }: NotificationListItemProps) {
  const context = useProjectTaskNotification(notification);
  return (
    <NotificationListRow
      notification={notification} onClick={onClick}
      leading={<UserAvatar src={context.senderAvatar} alt={context.senderName} className="size-10" />}
      title={projectTaskNotificationHeading(notification, context.senderName)}
      description={projectTaskNotificationDescription(notification, context.taskTitle, context.taskNumber)}
    >
      {context.projectName && <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <FolderKanban aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">Project: {context.projectName}</span>
      </span>}
      {Array.isArray(notification.metadata?.changes) && <span className="mt-1 block line-clamp-2 text-xs font-normal text-muted-foreground">
        {notification.metadata.changes.map((change: { label?: string }) => change.label).filter(Boolean).join(' · ')}
      </span>}
    </NotificationListRow>
  );
}

export function ProjectTaskModalRenderer({ notification, onClose }: NotificationRendererProps) {
  const context = useProjectTaskNotification(notification);
  const openTask = useOpenProjectTaskNotification();
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <UserAvatar src={context.senderAvatar} alt={context.senderName} className="size-10" />
        <p className="text-sm font-semibold text-foreground">{projectTaskNotificationHeading(notification, context.senderName)}</p>
      </div>
      <p className="break-words text-sm text-foreground">{projectTaskNotificationDescription(notification, context.taskTitle, context.taskNumber)}</p>
      {context.projectName && <p className="text-sm text-muted-foreground">Project: {context.projectName}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {getProjectTaskNotificationLink(notification) && <Button onClick={() => openTask(notification, onClose)}>Open task</Button>}
      </div>
    </div>
  );
}
