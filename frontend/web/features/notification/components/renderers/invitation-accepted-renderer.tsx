"use client";

import React from "react";
import {
  Notification,
  InvitationResponseMetadata,
} from "../../types/notification.types";
import { CheckCircle2, User } from "lucide-react";
import Image from "next/image";
import { formatTimeAgo } from "@/lib/date";
import { NotificationCategoryIcon } from "../notification-category-icon";

export const InvitationAcceptedListItemRenderer: React.FC<{
  notification: Notification;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-3 hover:bg-background cursor-pointer transition border-b border-border last:border-0 ${!notification.isRead ? "bg-info-soft/50" : ""}`}
    >
      <NotificationCategoryIcon notification={notification} className="h-10 w-10" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-success-content bg-success-soft px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={10} /> Joined
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground line-clamp-2">
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          <span className="font-semibold text-foreground">
            {notification.senderName || "New member"}
          </span>{" "}
          accepted the invitation to join the space
        </p>
        <p className="text-xs font-medium text-muted-foreground mt-1">
          {formatTimeAgo(new Date(notification.createdAt))}
        </p>
      </div>
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-link mt-1.5 flex-shrink-0"></div>
      )}
    </div>
  );
};

export const InvitationAcceptedModalRenderer: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const metadata =
    notification.metadata as unknown as InvitationResponseMetadata;

  return (
    <div className="p-5">
      <div className="flex flex-col items-center justify-center mb-6 text-center">
        <div className="relative mb-4">
          <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-border ring-4 ring-success-outline bg-success-soft flex items-center justify-center text-success-content">
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

          <div className="absolute -bottom-1 -right-1 bg-success text-success-foreground p-1 rounded-full border-2 border-border">
            <CheckCircle2 size={12} strokeWidth={3} />
          </div>
        </div>
        <h3 className="text-section-title font-semibold text-foreground mb-1">
          {notification.senderName || "New member"}
        </h3>
        <p className="text-sm font-medium text-success-content bg-success-soft px-3 py-1 rounded-full inline-block">
          Accepted invitation
        </p>
      </div>

      <div className="bg-background p-4 rounded-panel border border-border mb-6 text-sm text-muted-foreground text-center">
        <span className="font-semibold">
          {notification.senderName || "This user"}
        </span>{" "}
        is now a member of the space{" "}
        <span className="font-semibold text-foreground">
          {metadata?.conversationName || "chat"}
        </span>
        .
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4 mt-2">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-control text-sm font-semibold transition cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
