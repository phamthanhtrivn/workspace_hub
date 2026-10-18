"use client";

import React, { useEffect, useState, useCallback } from "react";

import { Notification } from "../types/notification.types";
import { getNotificationRenderer } from "./notification-registry";
import { DefaultModalRenderer } from "./renderers/default-renderer";
import { X } from "lucide-react";
import { useAppDispatch } from "@/store/store";
import { markReadSuccess } from "@/store/notification/notification.slice";
import { markAsRead } from "../api/notification.api";
import { Button } from "@/components/ui/button";
import { DialogSurface } from "@/components/ui/dialog";


interface NotificationDetailModalProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationDetailModal = React.memo(function NotificationDetailModal({
  notification,
  onClose,
}: NotificationDetailModalProps) {
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto mark as read when opened
  useEffect(() => {
    if (!notification.isRead) {
      markAsRead(notification.id)
        .then(() => dispatch(markReadSuccess(notification.id)))
        .catch(console.error);
    }
  }, [notification, dispatch]);

  const handleMarkAsRead = useCallback(
    (id: string) => {
      if (!notification.isRead) {
        markAsRead(id)
          .then(() => dispatch(markReadSuccess(id)))
          .catch(console.error);
      }
    },
    [notification.isRead, dispatch],
  );

  const renderer = getNotificationRenderer(notification.type);
  const ModalContent = renderer ? renderer.modalRenderer : DefaultModalRenderer;

  if (!mounted) return null;

  return <DialogSurface onClose={onClose}>{<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div
        className="absolute inset-0 bg-overlay/40"
        onClick={onClose}
      ></div>
      <div className="relative bg-card rounded-panel w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
          <h2 className="font-semibold text-foreground">Notification Details</h2>
          <Button variant="unstyled" aria-label="Close"
            onClick={onClose}
            className="p-1 rounded-control text-muted-foreground hover:bg-accent hover:text-muted-foreground transition cursor-pointer"
          >
            <X size={18} />
          </Button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto">
          <ModalContent
            notification={notification}
            onClose={onClose}
            onMarkAsRead={handleMarkAsRead}
          />
        </div>
      </div>
    </div>}</DialogSurface>;
});

export default NotificationDetailModal;
