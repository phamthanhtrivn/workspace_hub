import { useRef } from "react";
import Link from "next/link";
import { Bell, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        aria-describedby="dashboard-notification-content"
      >
        <DialogHeader>
          <DialogTitle id="dashboard-notification-title">
            {notification.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/5 text-primary"
            >
              <Bell size={20} />
            </span>
            <p
              id="dashboard-notification-content"
              className="min-w-0 whitespace-pre-wrap break-words pt-1 text-sm leading-6 text-muted-foreground"
            >
              {notification.content}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {safeLink && (
            <Button asChild>
              <Link href={safeLink} onClick={onClose}>
                Open details <ArrowUpRight size={16} />
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
