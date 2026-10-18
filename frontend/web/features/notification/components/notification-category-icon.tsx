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
import type {
  Notification,
  NotificationCategory,
} from "../types/notification.types";
import { getNotificationCategory } from "../utils/notification-category.utils";

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
  notification: Pick<Notification, "type" | "link">;
  className?: string;
}) {
  const category = getNotificationCategory(notification);
  const { Icon, className: toneClassName } = categoryIconConfig[category];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-full",
        toneClassName,
        className,
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}
