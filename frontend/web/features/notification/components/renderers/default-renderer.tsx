"use client";

import React from "react";
import { Notification } from "../../types/notification.types";
import { Bell } from "lucide-react";
import Image from "next/image";
import { formatTimeAgo } from "@/lib/date";
import { NotificationListRow } from "../notification-list-row";
import { Button } from "@/components/ui/button";


export const DefaultListItemRenderer: React.FC<{
  notification: Notification;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  return <NotificationListRow notification={notification} onClick={onClick} title={notification.title} description={notification.content} />;
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
