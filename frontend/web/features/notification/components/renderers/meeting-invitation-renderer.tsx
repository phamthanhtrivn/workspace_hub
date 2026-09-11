"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Video,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRespondMeetingInvitation } from "@/features/meeting/hooks/useScheduledMeetings";
import { useAppDispatch } from "@/store/store";
import { setMeetingInvitationStatus } from "@/store/notification/notification.slice";
import { formatTimeAgo } from "@/lib/date";
import { NotificationCategoryIcon } from "../notification-category-icon";
import type {
  MeetingInvitationMetadata,
  MeetingInvitationNotificationStatus,
  Notification,
} from "../../types/notification.types";
import { NotificationType } from "../../types/notification.types";

const statusLabels: Record<MeetingInvitationNotificationStatus, string> = {
  PENDING: "Waiting for response",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

const statusClasses: Record<MeetingInvitationNotificationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DECLINED: "bg-slate-100 text-slate-600 ring-slate-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
};

function getMetadata(notification: Notification): MeetingInvitationMetadata {
  return notification.metadata as unknown as MeetingInvitationMetadata;
}

function getMeetingStatus(
  notification: Notification,
): MeetingInvitationNotificationStatus {
  const metadata = getMetadata(notification);
  if (metadata.status) return metadata.status;
  return notification.type === NotificationType.MEETING_CANCELLED
    ? "CANCELLED"
    : "PENDING";
}

function getActionLabel(notification: Notification): string {
  if (notification.type === NotificationType.MEETING_UPDATED) {
    return "updated this meeting";
  }
  if (notification.type === NotificationType.MEETING_CANCELLED) {
    return "cancelled this meeting";
  }
  if (notification.type === NotificationType.MEETING_INVITATION_DECLINED) {
    return "declined this invitation";
  }
  return "invited you";
}

function formatMeetingRange(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
) {
  if (!startAt || !endAt) return "Time not set";
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Time not set";
  }

  return `${start.toLocaleDateString(undefined, {
    dateStyle: "medium",
  })}, ${start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }
  return error instanceof Error
    ? error.message
    : "Could not process meeting invitation";
}

function getMeetingHref(joinToken: string) {
  return `/meetings?tab=upcoming&meeting=${encodeURIComponent(joinToken)}`;
}

export function MeetingInvitationListItemRenderer({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const metadata = getMetadata(notification);
  const status = getMeetingStatus(notification);
  const senderName = notification.senderName || "Someone";
  const shouldShowStatus =
    notification.type !== NotificationType.MEETING_UPDATED || metadata.status;

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
            {metadata.title || notification.title}
          </span>
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">
            {formatTimeAgo(new Date(notification.createdAt))}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-600">
          {senderName} {getActionLabel(notification)}
        </span>
        <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
          {formatMeetingRange(metadata.scheduledStartAt, metadata.scheduledEndAt)}
        </span>
        {shouldShowStatus ? (
          <span
            className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${statusClasses[status]}`}
          >
            {statusLabels[status]}
          </span>
        ) : null}
      </span>
      {!notification.isRead && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
      )}
    </button>
  );
}

export function MeetingInvitationModalRenderer({
  notification,
  onClose,
  onMarkAsRead,
}: {
  notification: Notification;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
}) {
  const metadata = getMetadata(notification);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const respondMutation = useRespondMeetingInvitation();
  const [status, setStatus] =
    useState<MeetingInvitationNotificationStatus>(getMeetingStatus(notification));
  const [action, setAction] = useState<"accept" | "decline" | null>(null);
  const senderName = notification.senderName || "Someone";
  const isPending =
    notification.type === NotificationType.MEETING_INVITATION &&
    status === "PENDING";
  const canOpenMeeting =
    Boolean(metadata.joinToken) &&
    (status === "ACCEPTED" ||
      notification.type === NotificationType.MEETING_UPDATED ||
      notification.type === NotificationType.MEETING_INVITATION_DECLINED);
  const shouldShowStatus =
    notification.type !== NotificationType.MEETING_UPDATED || metadata.status;

  const openMeeting = () => {
    onClose();
    router.push(getMeetingHref(metadata.joinToken));
  };

  const respond = async (nextAction: "accept" | "decline") => {
    if (!metadata.joinToken) {
      toast.error("Meeting invitation is missing its join token");
      return;
    }

    setAction(nextAction);
    try {
      await respondMutation.mutateAsync({
        joinToken: metadata.joinToken,
        action: nextAction,
      });
      const nextStatus = nextAction === "accept" ? "ACCEPTED" : "DECLINED";
      setStatus(nextStatus);
      dispatch(
        setMeetingInvitationStatus({
          notificationId: notification.id,
          status: nextStatus,
        }),
      );
      onMarkAsRead(notification.id);

      if (nextAction === "accept") {
        toast.success("Meeting invitation accepted");
        onClose();
        router.push(getMeetingHref(metadata.joinToken));
      } else {
        toast.success("Meeting invitation declined");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setAction(null);
    }
  };

  return (
    <div className="p-5">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 p-5 text-center ring-1 ring-indigo-100">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
          <Video className="h-7 w-7" />
        </span>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-indigo-700">
          Meeting invitation
        </p>
        <h3 className="mt-1 text-xl font-black text-slate-950">
          {metadata.title || notification.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {senderName} {getActionLabel(notification)}.
        </p>
      </div>

      <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <CalendarClock className="h-4 w-4 text-indigo-600" />
          {formatMeetingRange(metadata.scheduledStartAt, metadata.scheduledEndAt)}
        </span>
        <span className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Clock3 className="h-4 w-4" />
            Received {formatTimeAgo(new Date(notification.createdAt))}
          </span>
          {shouldShowStatus ? (
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusClasses[status]}`}
            >
              {statusLabels[status]}
            </span>
          ) : null}
        </span>
      </div>

      {isPending ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void respond("decline")}
            disabled={action !== null}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action === "decline" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Decline
          </button>
          <button
            type="button"
            onClick={() => void respond("accept")}
            disabled={action !== null}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action === "accept" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Accept
          </button>
        </div>
      ) : canOpenMeeting ? (
        <button
          type="button"
          onClick={openMeeting}
          className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <CheckCircle2 className="h-4 w-4" />
          Open scheduled meeting
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
