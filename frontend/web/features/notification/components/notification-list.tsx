"use client";

import React from "react";
import { Notification } from "../types/notification.types";
import NotificationItem from "./notification-item";

interface NotificationListProps {
  notifications: Notification[];
  onItemClick: (notification: Notification) => void;
  isLoading?: boolean;
}

const NotificationList = React.memo(function NotificationList({ notifications, onItemClick, isLoading }: NotificationListProps) {
  if (isLoading && notifications.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--color-primary)]"></div>
        <p className="text-sm mt-2 font-medium">Đang tải...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="text-sm font-medium">Không có thông báo nào</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {notifications.map((notification) => (
        <NotificationItem 
          key={notification.id} 
          notification={notification} 
          onClick={onItemClick} 
        />
      ))}
    </div>
  );
});

export default NotificationList;
