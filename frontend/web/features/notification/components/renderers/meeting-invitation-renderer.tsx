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
import { getNotificationApiErrorMessage } from "../../utils/notification-display.utils";
import {
  formatMeetingRange,
  getMeetingActionLabel,
  getMeetingHref,
  getMeetingInvitationMetadata,
  getMeetingStatus,
} from "../../utils/meeting-invitation.utils";
import { NotificationCategoryIcon } from "../notification-category-icon";
import type {
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
  PENDING: "bg-warning-soft text-warning ring-warning",
  ACCEPTED: "bg-success-soft text-success ring-success",
  DECLINED: "bg-muted text-muted-foreground ring-ring",
  CANCELLED: "bg-destructive-soft text-destructive ring-destructive",
};

export function MeetingInvitationListItemRenderer({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const metadata = getMeetingInvitationMetadata(notification);
  const status = getMeetingStatus(notification);
  const senderName = notification.senderName || "Someone";
  const shouldShowStatus =
    notification.type !== NotificationType.MEETING_UPDATED || metadata.status;

  return (
    <button
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
            {metadata.title || notification.title}
          </span>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {formatTimeAgo(new Date(notification.createdAt))}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
          {senderName} {getMeetingActionLabel(notification)}
        </span>
        <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
          {formatMeetingRange(metadata.scheduledStartAt, metadata.scheduledEndAt)}
        </span>
        {shouldShowStatus ? (
          <span
            className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${statusClasses[status]}`}
          >
            {statusLabels[status]}
          </span>
        ) : null}
      </span>
      {!notification.isRead && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
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
  const metadata = getMeetingInvitationMetadata(notification);
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
      toast.error(
        getNotificationApiErrorMessage(
          error,
          "Could not process meeting invitation",
        ),
      );
    } finally {
      setAction(null);
    }
  };

  return (
    <div className="p-5">
      <div className="rounded-panel bg-info-soft p-5 text-center ring-1 ring-ring">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-panel bg-primary text-primary-foreground">
          <Video className="h-7 w-7" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-info">
          Meeting invitation
        </p>
        <h3 className="mt-1 text-section-title font-semibold text-foreground">
          {metadata.title || notification.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {senderName} {getMeetingActionLabel(notification)}.
        </p>
      </div>

      <div className="mt-4 space-y-2 rounded-panel border border-border bg-background px-3 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarClock className="h-4 w-4 text-info" />
          {formatMeetingRange(metadata.scheduledStartAt, metadata.scheduledEndAt)}
        </span>
        <span className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            Received {formatTimeAgo(new Date(notification.createdAt))}
          </span>
          {shouldShowStatus ? (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClasses[status]}`}
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
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-border bg-card text-sm font-semibold text-muted-foreground transition hover:border-border hover:bg-destructive-soft hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
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
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-control bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
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
          className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-success text-sm font-semibold text-success-foreground transition hover:bg-success"
        >
          <CheckCircle2 className="h-4 w-4" />
          Open scheduled meeting
        </button>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full cursor-pointer rounded-control py-2 text-xs font-semibold text-muted-foreground transition hover:bg-background hover:text-muted-foreground"
      >
        Close
      </button>
    </div>
  );
}
