import { useRef } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModalDialog } from "@/features/calendar/hooks/use-modal-dialog";
import type { Notification } from "@/features/notification/types/notification.types";

export function DashboardNotificationDialog({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDialog({ dialogRef, onClose });
  const safeLink =
    notification.link?.startsWith("/") &&
    !notification.link.startsWith("//") &&
    !notification.link.includes("\\")
      ? notification.link
      : null;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        ref={dialogRef}
        aria-labelledby="dashboard-notification-title"
      >
        <DialogHeader>
          <DialogTitle id="dashboard-notification-title">
            {notification.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">{notification.content}</p>
        {safeLink && (
          <Link
            href={safeLink}
            onClick={onClose}
            className="text-sm font-medium text-[var(--color-primary)]"
          >
            Open details
          </Link>
        )}
      </DialogContent>
    </Dialog>
  );
}
