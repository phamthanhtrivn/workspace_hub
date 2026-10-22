"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/date";
import type { NotificationListItemProps } from "./notification-registry";
import { NotificationCategoryIcon } from "./notification-category-icon";

interface NotificationListRowProps extends NotificationListItemProps {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
}

/** List renderers own their content; row geometry and read state stay consistent. */
export function NotificationListRow({ notification, onClick, title, description, badge, children }: NotificationListRowProps) {
  return (
    <Button
      variant="unstyled"
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full min-w-0 items-start gap-3 p-3 text-left whitespace-normal motion-safe:transition-colors motion-safe:duration-150 hover:bg-accent focus-visible:ring-inset",
        notification.isRead ? "bg-card" : "bg-info-soft/60",
      )}
    >
      <NotificationCategoryIcon notification={notification} className="size-10" />
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        {badge && <span className="mb-1 flex flex-wrap items-center gap-2">{badge}</span>}
        <span className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{title}</span>
        {description && <span className="mt-0.5 line-clamp-2 text-xs font-normal text-muted-foreground">{description}</span>}
        {children}
        <time dateTime={notification.createdAt} className="mt-1 block text-xs font-normal text-muted-foreground">
          {formatTimeAgo(new Date(notification.createdAt))}
        </time>
      </span>
      <span className="mt-1.5 flex size-2 shrink-0">
        {!notification.isRead && <><span aria-hidden className="size-2 rounded-full bg-link" /><span className="sr-only">Unread</span></>}
      </span>
    </Button>
  );
}
