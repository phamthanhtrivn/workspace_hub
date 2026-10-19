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

import type { Notification } from "@/features/notification/types/notification.types";

export function DashboardNotificationDialog({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

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
        className="flex min-h-0 flex-col [&>button]:right-2 [&>button]:top-2 [&>button]:size-11"
      >
        <DialogHeader
          role="region"
          aria-label="Notification title"
          tabIndex={0}
          className="max-h-[25dvh] shrink-0 overflow-y-auto pr-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <DialogTitle
            id="dashboard-notification-title"
            className="break-words [overflow-wrap:anywhere]"
          >
            {notification.title}
          </DialogTitle>
        </DialogHeader>
        <div
          role="region"
          aria-label="Notification message"
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-secondary text-secondary-foreground"
            >
              <Bell size={20} />
            </span>
            <p
              id="dashboard-notification-content"
              className="min-w-0 whitespace-pre-wrap break-words pt-1 text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]"
            >
              {notification.content}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-muted px-5 py-3 sm:px-6">
          <Button variant="outline" onClick={onClose} className="h-auto min-h-11 max-w-full whitespace-normal">
            Close
          </Button>
          {safeLink && (
            <Button asChild className="h-auto min-h-11 max-w-full whitespace-normal">
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
