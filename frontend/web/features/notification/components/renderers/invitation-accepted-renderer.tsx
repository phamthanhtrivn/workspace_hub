"use client";

import React from "react";
import {
  Notification,
  InvitationResponseMetadata,
} from "../../types/notification.types";
import { CheckCircle2, User } from "lucide-react";
import Image from "next/image";
import { NotificationListRow } from "../notification-list-row";
import { Button } from "@/components/ui/button";


export const InvitationAcceptedListItemRenderer: React.FC<{
  notification: Notification;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  return (
    <NotificationListRow notification={notification} onClick={onClick} title={notification.title}
      badge={<span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-success-content"><CheckCircle2 size={10} /> Joined</span>}
      description={<><span className="font-semibold text-foreground">{notification.senderName || "New member"}</span>{" "}accepted the invitation to join the space</>}
    />
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
