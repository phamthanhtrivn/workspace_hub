"use client";

import { CalendarClock, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatTimeAgo } from "@/lib/date";
import type { Notification } from "../../types/notification.types";
import { NotificationCategoryIcon } from "../notification-category-icon";

function getEventTitle(notification: Notification): string {
  return (
    (notification.metadata?.eventTitle as string | undefined) ||
    notification.title ||
    "Calendar reminder"
  );
}

export function CalendarReminderListItemRenderer({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 border-b border-slate-100 p-3 text-left transition last:border-0 hover:bg-blue-50/50 ${
        notification.isRead ? "bg-white" : "bg-blue-50/60"
      }`}
    >
      <NotificationCategoryIcon notification={notification} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-black text-slate-900">
            {getEventTitle(notification)}
          </span>
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">
            {formatTimeAgo(new Date(notification.createdAt))}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-600">
          {notification.content}
        </span>
      </span>
      {!notification.isRead && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
      )}
    </button>
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
      <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 p-5 text-center ring-1 ring-sky-100">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
          <CalendarClock className="h-7 w-7" />
        </span>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-sky-700">
          Calendar reminder
        </p>
        <h3 className="mt-1 text-xl font-black text-slate-950">
          {getEventTitle(notification)}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {notification.content}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500">
        <Clock3 className="h-4 w-4" />
        Received {formatTimeAgo(new Date(notification.createdAt))}
      </div>

      {canOpenCalendar ? (
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push(notification.link!);
          }}
          className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-sky-600 text-sm font-bold text-white transition hover:bg-sky-700"
        >
          <CalendarClock className="h-4 w-4" />
          Open calendar
        </button>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full cursor-pointer rounded-xl py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
      >
        Close
      </button>
    </div>
  );
}
