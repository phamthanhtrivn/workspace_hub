"use client";

import {
  Bell,
  CalendarDays,
  FileText,
  FolderKanban,
  MessageCircle,
  Video,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDocumentIconConfig } from "@/features/documents/components/common/document-icon";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { ProjectIdentityIcon } from "@/features/project/components/ui/project-identity";
import type {
  Notification,
  NotificationCategory,
} from "../types/notification.types";
import { getNotificationCategory } from "../utils/notification-category.utils";
import { getProjectColor } from "../utils/project-invitation.utils";

interface NotificationCategoryIconConfig {
  Icon: LucideIcon;
  className: string;
}

const categoryIconConfig: Record<
  NotificationCategory,
  NotificationCategoryIconConfig
> = {
  ALL: {
    Icon: Bell,
    className: "bg-primary-soft text-primary-soft-foreground",
  },
  PROJECT: {
    Icon: FolderKanban,
    className: "bg-primary-soft text-primary-soft-foreground",
  },
  CHAT: {
    Icon: MessageCircle,
    className: "bg-primary-soft text-primary-soft-foreground",
  },
  CALENDAR: {
    Icon: CalendarDays,
    className: "bg-primary-soft text-primary-soft-foreground",
  },
  MEETING: {
    Icon: Video,
    className: "bg-primary-soft text-primary-soft-foreground",
  },
  DOCUMENT: {
    Icon: FileText,
    className: "bg-success-soft text-success-content",
  },
};

export function NotificationCategoryIcon({
  notification,
  className,
}: {
  notification: Pick<Notification, "type" | "link" | "metadata">;
  className?: string;
}) {
  const category = getNotificationCategory(notification);
  const metadata = notification.metadata ?? {};
  if (
    category === "PROJECT" &&
    typeof metadata.projectIcon === "string" &&
    metadata.projectIcon.trim()
  ) {
    return (
      <ProjectIdentityIcon
        icon={metadata.projectIcon.trim()}
        color={getProjectColor(
          typeof metadata.projectColor === "string"
            ? metadata.projectColor
            : undefined,
        )}
        className={cn("rounded-full", className)}
      />
    );
  }
  if (category === "DOCUMENT") {
    const config = getDocumentIconConfig({
      type:
        metadata.itemType === DocumentItemType.FOLDER
          ? DocumentItemType.FOLDER
          : DocumentItemType.FILE,
      name:
        typeof metadata.documentName === "string" ? metadata.documentName : "",
      mimeType:
        typeof metadata.mimeType === "string" ? metadata.mimeType : null,
    });
    if (!config.isFallback) {
      const DocumentTypeIcon = config.icon;

      return (
        <span
          aria-hidden="true"
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full",
            config.bgClass,
            config.colorClass,
            className,
          )}
        >
          <DocumentTypeIcon size={20} />
        </span>
      );
    }
  }
  const { Icon, className: toneClassName } = categoryIconConfig[category];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full",
        toneClassName,
        className,
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}
