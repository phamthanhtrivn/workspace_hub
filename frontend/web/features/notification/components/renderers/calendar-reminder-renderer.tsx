"use client";

import { CalendarClock, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatTimeAgo } from "@/lib/date";
import type { Notification } from "../../types/notification.types";
import { getCalendarReminderTitle } from "../../utils/notification-display.utils";
import { NotificationCategoryIcon } from "../notification-category-icon";
import { Button } from "@/components/ui/button";


export function CalendarReminderListItemRenderer({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  return (
    <Button variant="unstyled"
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-start gap-3 border-b border-border p-3 text-left transition last:border-0 hover:bg-info-soft/50 ${
        notification.isRead ? "bg-card" : "bg-info-soft/60"
      }`}
    >
      <NotificationCategoryIcon notification={notification} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {getCalendarReminderTitle(notification)}
          </span>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {formatTimeAgo(new Date(notification.createdAt))}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
          {notification.content}
        </span>
      </span>
      {!notification.isRead && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-link" />
      )}
    </Button>
  );
}

export function CalendarReminderModalRenderer({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const router = useRouter();
  const canOpenCalendar = Boolean(notification.link);

  return (
    <div className="p-5">
      <div className="rounded-panel bg-info-soft p-5 text-center ring-1 ring-ring">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-panel bg-primary text-primary-foreground">
          <CalendarClock className="h-7 w-7" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-info-content">
          Calendar Notification
        </p>
        <h3 className="mt-1 text-section-title font-semibold text-foreground">
          {getCalendarReminderTitle(notification)}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {notification.content}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-panel border border-border bg-background px-3 py-3 text-xs font-semibold text-muted-foreground">
        <Clock3 className="h-4 w-4" />
        Received {formatTimeAgo(new Date(notification.createdAt))}
      </div>

      {canOpenCalendar ? (
        <Button variant="default"
          type="button"
          onClick={() => {
            onClose();
            const rawLink = notification.link!;
            const sep = rawLink.includes("?") ? "&" : "?";
            router.push(`${rawLink}${sep}t=${Date.now()}`);
          }}
          className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-control text-sm font-semibold transition"
        >
          <CalendarClock className="h-4 w-4" />
          Open in Calendar
        </Button>
      ) : null}

      <Button variant="ghost"
        type="button"
        onClick={onClose}
        className="mt-3 w-full cursor-pointer rounded-control py-2 text-xs font-semibold transition"
      >
        Close
      </Button>
    </div>
  );
}
