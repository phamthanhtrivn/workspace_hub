"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
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
import { NotificationListRow } from "../notification-list-row";
import type {
  MeetingInvitationNotificationStatus,
  Notification,
} from "../../types/notification.types";
import { NotificationType } from "../../types/notification.types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";


const statusLabels: Record<MeetingInvitationNotificationStatus, string> = {
  PENDING: "Waiting for response",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

const statusClasses: Record<MeetingInvitationNotificationStatus, string> = {
  PENDING: "bg-warning-soft text-warning-content ring-warning-outline",
  ACCEPTED: "bg-success-soft text-success-content ring-success-outline",
  DECLINED: "bg-muted text-muted-foreground ring-ring",
  CANCELLED: "bg-destructive-soft text-destructive-content ring-destructive-outline",
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
    <NotificationListRow notification={notification} onClick={onClick} title={metadata.title || notification.title}
      description={<>{senderName} {getMeetingActionLabel(notification)}</>}
    >
      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{formatMeetingRange(metadata.scheduledStartAt, metadata.scheduledEndAt)}</span>
      {shouldShowStatus && <span className={"mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 " + statusClasses[status]}>{statusLabels[status]}</span>}
    </NotificationListRow>
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
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-info-content">
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
          <CalendarClock className="h-4 w-4 text-info-content" />
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
          <Button aria-busy={action === "decline" || undefined} variant="unstyled"
            type="button"
            onClick={() => void respond("decline")}
            disabled={action !== null}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-border bg-card text-sm font-semibold text-muted-foreground transition hover:border-border hover:bg-destructive-soft hover:text-destructive-content disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action === "decline" ? (
              <Spinner />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Decline
          </Button>
          <Button aria-busy={action === "accept" || undefined} variant="default"
            type="button"
            onClick={() => void respond("accept")}
            disabled={action !== null}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-control text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action === "accept" ? (
              <Spinner tone="inherit" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Accept
          </Button>
        </div>
      ) : canOpenMeeting ? (
        <Button variant="success"
          type="button"
          onClick={openMeeting}
          className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-control text-sm font-semibold transition"
        >
          <CheckCircle2 className="h-4 w-4" />
          Open scheduled meeting
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
