"use client";

import React from "react";
import { Notification } from "../types/notification.types";
import { getNotificationRenderer } from "./notification-registry";
import { DefaultListItemRenderer } from "./renderers/default-renderer";
import { Loader2, Trash2 } from "lucide-react";

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
    <div className="group relative [&>*:first-child]:pr-12">
      <ListItem
        notification={notification}
        onClick={() => onClick(notification)}
      />
      {onDelete ? (
        <button
          type="button"
          aria-label={deleteLabel}
          title={deleteLabel}
          disabled={isDeleting}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(notification.id);
          }}
          className="absolute right-3 top-3 grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-transparent bg-white/90 text-slate-400 shadow-sm ring-1 ring-slate-200/70 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      ) : null}
    </div>
  );
});

export default NotificationItem;
