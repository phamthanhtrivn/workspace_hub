"use client";

import React from "react";
import {
  Notification,
  InvitationResponseMetadata,
} from "../../types/notification.types";
import { XCircle, User } from "lucide-react";
import Image from "next/image";
import { formatTimeAgo } from "@/lib/date";
import { NotificationCategoryIcon } from "../notification-category-icon";
import { Button } from "@/components/ui/button";


export const InvitationDeclinedListItemRenderer: React.FC<{
  notification: Notification;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  return (
    <Button variant="unstyled" type="button"
      onClick={onClick}
      className={`flex items-start gap-3 p-3 hover:bg-background cursor-pointer transition border-b border-border last:border-0 ${!notification.isRead ? "bg-info-soft/50" : ""}`}
    >
      <NotificationCategoryIcon notification={notification} className="h-10 w-10" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-destructive-content bg-destructive-soft px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <XCircle size={10} /> Declined
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground line-clamp-2">
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          <span className="font-semibold text-foreground">
            {notification.senderName || "Invited user"}
          </span>{" "}
          declined the invitation
        </p>
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

export const InvitationDeclinedModalRenderer: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const metadata =
    notification.metadata as unknown as InvitationResponseMetadata;

  return (
    <div className="p-5">
      <div className="flex flex-col items-center justify-center mb-6 text-center">
        <div className="relative mb-4">
          <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-border ring-4 ring-destructive-outline bg-destructive-soft flex items-center justify-center text-destructive-content">
            {notification.senderAvatar ? (
              <Image
                src={notification.senderAvatar}
                alt="Avatar"
                fill
                className="object-cover"
              />
            ) : (
              <User size={32} />
            )}
          </div>

          <div className="absolute -bottom-1 -right-1 bg-destructive text-destructive-foreground p-1 rounded-full border-2 border-border">
            <XCircle size={12} strokeWidth={3} />
          </div>
        </div>
        <h3 className="text-section-title font-semibold text-foreground mb-1">
          {notification.senderName || "Invited user"}
        </h3>
        <p className="text-sm font-medium text-destructive-content bg-destructive-soft px-3 py-1 rounded-full inline-block">
          Declined invitation
        </p>
      </div>

      <div className="bg-background p-4 rounded-panel border border-border mb-6 text-sm text-muted-foreground text-center">
        <span className="font-semibold">
          {notification.senderName || "This user"}
        </span>{" "}
        declined to join the space{" "}
        <span className="font-semibold text-foreground">
          {metadata?.conversationName || "chat"}
        </span>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4 mt-2">
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
