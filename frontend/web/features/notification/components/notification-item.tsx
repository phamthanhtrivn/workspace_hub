"use client";

import React from "react";
import { Notification } from "../types/notification.types";
import { getNotificationRenderer } from "./notification-registry";
import { DefaultListItemRenderer } from "./renderers/default-renderer";
import { Loader2, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";


interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
  onDelete?: (notificationId: string) => void;
  isDeleting?: boolean;
  deleteLabel?: string;
}

const NotificationItem = React.memo(function NotificationItem({
  notification,
  onClick,
  onDelete,
  isDeleting,
  deleteLabel = "Delete notification",
}: NotificationItemProps) {
  const renderer = getNotificationRenderer(notification.type);

  const ListItem = renderer ? renderer.listItemRenderer : DefaultListItemRenderer;

  return (
    <div role="listitem" className={cn("group relative min-w-0 border-b border-border last:border-0", onDelete && "[&>button:first-child]:pr-14")}>
      <ListItem
        notification={notification}
        onClick={() => onClick(notification)}
      />
      {onDelete ? (
        <IconButton
          label={deleteLabel}
          showTooltip={false}
          title={deleteLabel}
          disabled={isDeleting}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(notification.id);
          }}
          className="absolute right-1 top-1 size-11 text-muted-foreground hover:bg-destructive-soft hover:text-destructive-content"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </IconButton>
      ) : null}
    </div>
  );
});

export default NotificationItem;
