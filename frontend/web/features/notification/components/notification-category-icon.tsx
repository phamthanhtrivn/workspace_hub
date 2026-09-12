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
    className: "bg-slate-600 shadow-slate-600/20",
  },
  PROJECT: {
    Icon: FolderKanban,
    className: "bg-[#0052CC] shadow-blue-600/20",
  },
  CHAT: {
    Icon: MessageCircle,
    className: "bg-[#0C66E4] shadow-blue-600/20",
  },
  CALENDAR: {
    Icon: CalendarDays,
    className: "bg-sky-600 shadow-sky-600/20",
  },
  MEETING: {
    Icon: Video,
    className: "bg-violet-600 shadow-violet-600/20",
  },
  DOCUMENT: {
    Icon: FileText,
    className: "bg-emerald-600 shadow-emerald-600/20",
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
        "grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-sm",
        toneClassName,
        className,
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}
