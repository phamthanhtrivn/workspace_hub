"use client";

import { cn } from "@/lib/utils";
import { ProjectIdentityIcon } from "@/features/project/components/ui/project-identity";
import { useNotificationProject } from "../hooks/use-notification-project";
import type { NotificationProjectContext } from "../utils/notification-project-identity";
import { getProjectColor } from "../utils/project-invitation.utils";

export function NotificationProjectIcon({
  notification,
  compact = false,
  className,
}: {
  notification: NotificationProjectContext;
  compact?: boolean;
  className?: string;
}) {
  const project = useNotificationProject(notification);

  return (
    <ProjectIdentityIcon
      icon={project.projectIcon}
      color={getProjectColor(project.projectColor)}
      size={compact ? "sm" : "md"}
      className={cn(
        "rounded-full",
        compact && "size-4 border-0 bg-transparent text-xs [&>svg]:size-3.5",
        className,
      )}
    />
  );
}
