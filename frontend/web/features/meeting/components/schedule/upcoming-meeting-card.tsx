"use client";

import {
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
import type { ReactNode } from "react";
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
  const canStart = role === MEETING_ROLE.HOST || role === MEETING_ROLE.COHOST;
  const canManage = canStart && meeting.status === "SCHEDULED";
  const canJoin = meeting.status === "LIVE";
  const primaryLabel = canStart
    ? "Start"
    : canJoin
      ? "Join"
      : "Waiting for host";

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
        className={`flex min-h-48 flex-col justify-between rounded-lg border bg-white p-4 shadow-sm transition ${
          isHighlighted
            ? "border-blue-300 ring-4 ring-blue-100"
            : "border-slate-200"
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-black text-[#172B4D]">
                {meeting.title}
              </h3>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <CalendarClock className="h-4 w-4 shrink-0 text-[#0052CC]" />
                <span className="truncate">
                  {formatMeetingRange(
                    meeting.scheduledStartAt,
                    meeting.scheduledEndAt,
                  )}
                </span>
              </p>
            </div>
            <MeetingStatusTag status={meeting.status} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-slate-400">
                Host
              </p>
              <p className="truncate text-sm font-bold text-slate-600">
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

        <div className="flex items-center gap-2">
          <MeetingButton
            type="button"
            disabled={!canStart && !canJoin}
            onClick={() => router.push(MEETING_ROUTES.room(meeting.joinToken))}
            className="h-10 flex-1 cursor-pointer disabled:bg-slate-200 disabled:text-slate-500"
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
          {canManage ? (
            <MeetingIconButton
              label="Edit"
              icon={Pencil}
              tone="outline"
              controlSize="md"
              onClick={() => onEdit?.(meeting)}
            />
          ) : null}
          <MeetingIconButton
            label="Copy link"
            icon={Copy}
            tone="outline"
            controlSize="md"
            onClick={copyLink}
          />
          {canManage ? (
            <MeetingIconButton
              label="Cancel meeting"
              icon={cancelMeeting.isPending ? Loader2 : Trash2}
              tone="danger"
              controlSize="md"
              disabled={cancelMeeting.isPending}
              onClick={cancelScheduledMeeting}
              className={cancelMeeting.isPending ? "[&_svg]:animate-spin" : ""}
            />
          ) : null}
        </div>
      </article>
      <MeetingAlertDialog {...alertDialogProps} />
    </>
  );
}
