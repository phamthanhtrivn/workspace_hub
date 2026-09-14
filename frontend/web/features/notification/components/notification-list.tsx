"use client";

import React from "react";
import { Notification } from "../types/notification.types";
import NotificationItem from "./notification-item";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { Skeleton } from "@/components/ui/skeleton";
import { BellOff } from "lucide-react";

interface NotificationListProps {
  notifications: Notification[];
  onItemClick: (notification: Notification) => void;
  onDelete?: (notificationId: string) => void;
  deletingNotificationId?: string | null;
  isLoading?: boolean;
}

const NotificationList = React.memo(function NotificationList({
  notifications,
  onItemClick,
  onDelete,
  deletingNotificationId,
  isLoading,
}: NotificationListProps) {
  const intl = useAppIntl();

  if (isLoading && notifications.length === 0) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-3 border-b border-slate-100 p-3 last:border-0"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-full bg-slate-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4 bg-slate-100" />
              <Skeleton className="h-3 w-full bg-slate-100" />
              <Skeleton className="h-2.5 w-16 bg-slate-100" />
            </div>
          </div>
        ))}
        <p className="sr-only">
          {intl.formatMessage({ id: "notifications.loading" })}
        </p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-slate-500">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-200">
          <BellOff className="h-5 w-5" />
        </div>
        <p className="text-sm font-black text-slate-700">
          {intl.formatMessage({ id: "notifications.emptyTitle" })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white">
      {notifications.map((notification) => (
        <NotificationItem 
          key={notification.id} 
          notification={notification} 
          onClick={onItemClick} 
          onDelete={onDelete}
          isDeleting={deletingNotificationId === notification.id}
          deleteLabel={intl.formatMessage({ id: "notifications.deleteOne" })}
        />
      ))}
    </div>
  );
});

export default NotificationList;
