"use client";

import {
  Calendar,
  CalendarClock,
  Copy,
  Loader2,
  LogIn,
  Pencil,
  Play,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import { useMeetingConfirmDialog } from "../../hooks/useMeetingConfirmDialog";
import { useCancelScheduledMeeting } from "../../hooks/useScheduledMeetings";
import { copyTextFallback } from "../../utils/meeting-history.utils";
import {
  MEETING_ROLE,
  type UpcomingMeetingItem,
} from "../../types/meeting.types";
import { MEETING_ROUTES } from "../../types/meeting.constants";
import { MeetingAlertDialog } from "../common/meeting-alert-dialog";
import { MeetingStatusTag } from "../common/meeting-status-tag";
import { MeetingHistoryAvatarStack } from "../history/meeting-history-avatar-stack";
import { MeetingButton } from "../ui/meeting-form-controls";
import { MeetingIconButton } from "../ui/meeting-icon-button";

interface UpcomingMeetingCardProps {
  meeting: UpcomingMeetingItem;
  isHighlighted?: boolean;
  onEdit?: (meeting: UpcomingMeetingItem) => void;
}

function formatMeetingRange(startAt: string | null, endAt: string | null) {
  if (!startAt || !endAt) return "";
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  return `${start.toLocaleDateString("en-US", {
    dateStyle: "medium",
  })} · ${start.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function parseCalendarEventId(description?: string | null): string | null {
  if (!description) return null;
  const match = description.match(/\[Calendar Event(?::([a-zA-Z0-9_-]+))?\]/);
  return match?.[1] || null;
}

export function UpcomingMeetingCard({
  meeting,
  isHighlighted = false,
  onEdit,
}: UpcomingMeetingCardProps) {
  const router = useRouter();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const cancelMeeting = useCancelScheduledMeeting(meeting.joinToken);
  const { confirm, alertDialogProps } = useMeetingConfirmDialog();
  const role =
    meeting.myParticipant?.role ??
    (meeting.hostUserId === currentUserId
      ? MEETING_ROLE.HOST
      : MEETING_ROLE.PARTICIPANT);
  const isCalendarEvent = Boolean(
    meeting.description?.includes("[Calendar Event"),
  );
  const canStart = role === MEETING_ROLE.HOST || role === MEETING_ROLE.COHOST;
  const canManage =
    canStart && meeting.status === "SCHEDULED" && !isCalendarEvent;
  const canJoin = meeting.status === "LIVE";
  const primaryLabel = canStart
    ? "Start"
    : canJoin
      ? "Join"
      : "Waiting for host";

  const handleNavigateToCalendar = () => {
    const eventId = parseCalendarEventId(meeting.description);
    if (eventId) {
      router.push(`/calendar?event=${eventId}`);
    } else if (meeting.scheduledStartAt) {
      const dateStr = meeting.scheduledStartAt.slice(0, 10);
      router.push(`/calendar?date=${dateStr}`);
    } else {
      router.push("/calendar");
    }
  };

  const copyLink = async () => {
    const path = MEETING_ROUTES.room(meeting.joinToken);
    const link =
      typeof window === "undefined" ? path : `${window.location.origin}${path}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        copyTextFallback(link);
      }
      toast.success("Meeting link copied");
    } catch {
      toast.error("Could not copy meeting link");
    }
  };
  const cancelScheduledMeeting = async () => {
    const confirmed = await confirm({
      title: "Cancel this scheduled meeting?",
      description:
        "Participants will no longer be able to join from this invitation.",
      confirmLabel: "Cancel meeting",
      cancelLabel: "Cancel",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await cancelMeeting.mutateAsync();
      toast.success("Meeting cancelled");
    } catch {
      toast.error("Could not cancel meeting");
    }
  };

  return (
    <>
      <article
        data-meeting-join-token={meeting.joinToken}
        className={`flex min-h-48 min-w-0 flex-col justify-between rounded-panel border bg-card p-4 text-card-foreground transition-colors duration-150 ${
          isHighlighted
            ? "border-info-outline ring-2 ring-ring"
            : "border-border"
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 break-words text-base font-semibold leading-6 text-foreground">
                {meeting.title}
              </h3>
              <p className="mt-1 flex items-start gap-2 text-xs leading-5 tabular-nums text-muted-foreground">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0">
                  {formatMeetingRange(
                    meeting.scheduledStartAt,
                    meeting.scheduledEndAt,
                  )}
                </span>
              </p>
            </div>
            <div className="shrink-0">
              <MeetingStatusTag status={meeting.status} />
            </div>
          </div>

          {/* Host & Avatar Stack */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Host
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                {meeting.hostProfile?.fullName ||
                  meeting.hostProfile?.email ||
                  meeting.hostUserId}
              </p>
            </div>
            <MeetingHistoryAvatarStack
              participants={meeting.participants.slice(0, 4)}
              participantCount={meeting.participantCount}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
          {isCalendarEvent ? (
            <MeetingButton
              type="button"
              tone="primary"
              controlSize="md"
              onClick={handleNavigateToCalendar}
              className="h-9 flex-1 cursor-pointer rounded-control font-semibold"
            >
              <Calendar className="mr-1.5 h-4 w-4 shrink-0" />
              View Event
            </MeetingButton>
          ) : (
            <MeetingButton
              type="button"
              disabled={!canStart && !canJoin}
              onClick={() => router.push(MEETING_ROUTES.room(meeting.joinToken))}
              className="h-9 flex-1 cursor-pointer rounded-control font-semibold disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              {canStart ? (
                <Play className="h-4 w-4" />
              ) : canJoin ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UsersRound className="h-4 w-4" />
              )}
              {primaryLabel}
            </MeetingButton>
          )}
          {canManage ? (
            <MeetingIconButton
              label="Edit"
              icon={Pencil}
              tone="outline"
              controlSize="md"
              onClick={() => onEdit?.(meeting)}
              className="h-9 w-9 rounded-control"
            />
          ) : null}
          <MeetingIconButton
            label="Copy link"
            icon={Copy}
            tone="outline"
            controlSize="md"
            onClick={copyLink}
            className="h-9 w-9 rounded-control"
          />
          {canManage ? (
            <MeetingIconButton
              label="Cancel meeting"
              icon={cancelMeeting.isPending ? Loader2 : Trash2}
              tone="danger"
              controlSize="md"
              disabled={cancelMeeting.isPending}
              onClick={cancelScheduledMeeting}
              className={`h-9 w-9 rounded-control ${
                cancelMeeting.isPending ? "[&_svg]:animate-spin" : ""
              }`}
            />
          ) : null}
        </div>
      </article>
      <MeetingAlertDialog {...alertDialogProps} />
    </>
  );
}
