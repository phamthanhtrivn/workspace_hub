"use client";

import React from "react";
import { Notification } from "../../types/notification.types";
import { Bell } from "lucide-react";
import Image from "next/image";
import { formatTimeAgo } from "@/lib/date";
import { NotificationCategoryIcon } from "../notification-category-icon";
import { Button } from "@/components/ui/button";


export const DefaultListItemRenderer: React.FC<{
  notification: Notification;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  return (
    <Button variant="unstyled" type="button"
      onClick={onClick}
      className={`flex items-start gap-3 p-3 hover:bg-background cursor-pointer transition border-b border-border last:border-0 ${!notification.isRead ? "bg-info-soft/50" : ""}`}
    >
      <NotificationCategoryIcon
        notification={notification}
        className="h-10 w-10"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground line-clamp-2">
          {notification.title}
        </p>
        {notification.content && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {notification.content}
          </p>
        )}
        <p className="text-xs font-medium text-muted-foreground mt-1">
          {formatTimeAgo(new Date(notification.createdAt))}
        </p>
      </div>
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-link mt-1.5 flex-shrink-0"></div>
      )}
    </Button>
  );
};

export const DefaultModalRenderer: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative h-12 w-12 rounded-full bg-muted overflow-hidden flex items-center justify-center text-muted-foreground">
          {notification.senderAvatar ? (
            <Image
              src={notification.senderAvatar}
              alt="Avatar"
              fill
              className="object-cover"
            />
          ) : (
            <Bell size={24} />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{notification.title}</h3>
          <p className="text-xs text-muted-foreground">
            {formatTimeAgo(new Date(notification.createdAt))}
          </p>
        </div>
      </div>
      <div className="text-sm text-muted-foreground mb-6 bg-background p-3 rounded-lg border border-border">
        {notification.content}
      </div>
      <div className="flex justify-end">
        <Button variant="secondary"
          onClick={onClose}
          className="px-4 py-2 rounded-control text-sm font-semibold transition cursor-pointer"
        >
          Close
        </Button>
      </div>
    </div>
  );
};
