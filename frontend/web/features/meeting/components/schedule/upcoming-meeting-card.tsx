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
import { useAppIntl } from "@/features/i18n/useAppIntl";
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

interface UpcomingMeetingCardProps {
  meeting: UpcomingMeetingItem;
  onEdit?: (meeting: UpcomingMeetingItem) => void;
}

function formatMeetingRange(
  startAt: string | null,
  endAt: string | null,
  locale: string,
) {
  if (!startAt || !endAt) return "";
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  return `${start.toLocaleDateString(locale, {
    dateStyle: "medium",
  })} · ${start.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function UpcomingMeetingCard({
  meeting,
  onEdit,
}: UpcomingMeetingCardProps) {
  const intl = useAppIntl();
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
    ? "meeting.upcoming.start"
    : canJoin
      ? "meeting.upcoming.join"
      : "meeting.upcoming.waiting";

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
      toast.success(intl.formatMessage({ id: "meeting.upcoming.linkCopied" }));
    } catch {
      toast.error(intl.formatMessage({ id: "meeting.upcoming.linkCopyFailed" }));
    }
  };
  const cancelScheduledMeeting = async () => {
    const confirmed = await confirm({
      title: intl.formatMessage({ id: "meeting.upcoming.cancelConfirm" }),
      description: intl.formatMessage({
        id: "meeting.upcoming.cancelConfirmDescription",
      }),
      confirmLabel: intl.formatMessage({ id: "meeting.upcoming.cancel" }),
      cancelLabel: intl.formatMessage({ id: "app.cancel" }),
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await cancelMeeting.mutateAsync();
      toast.success(intl.formatMessage({ id: "meeting.upcoming.cancelled" }));
    } catch {
      toast.error(intl.formatMessage({ id: "meeting.upcoming.cancelFailed" }));
    }
  };

  return (
    <>
      <article className="flex min-h-52 flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
                    intl.locale,
                  )}
                </span>
              </p>
            </div>
            <MeetingStatusTag status={meeting.status} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "meeting.upcoming.host" })}
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

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            disabled={!canStart && !canJoin}
            onClick={() => router.push(MEETING_ROUTES.room(meeting.joinToken))}
            className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0052CC] px-3 text-sm font-black text-white transition hover:bg-[#0C66E4] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {canStart ? (
              <Play className="h-4 w-4" />
            ) : canJoin ? (
              <LogIn className="h-4 w-4" />
            ) : (
              <UsersRound className="h-4 w-4" />
            )}
            {intl.formatMessage({ id: primaryLabel })}
          </button>
          {canManage ? (
            <button
              type="button"
              onClick={() => onEdit?.(meeting)}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-[#0052CC]"
              aria-label={intl.formatMessage({ id: "meeting.upcoming.edit" })}
              title={intl.formatMessage({ id: "meeting.upcoming.edit" })}
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}
          <IconActionButton
            label={intl.formatMessage({ id: "meeting.upcoming.copyLink" })}
            onClick={copyLink}
          >
            <Copy className="h-4 w-4" />
          </IconActionButton>
          {canManage ? (
            <IconActionButton
              label={intl.formatMessage({ id: "meeting.upcoming.cancel" })}
              disabled={cancelMeeting.isPending}
              tone="danger"
              onClick={cancelScheduledMeeting}
            >
              {cancelMeeting.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </IconActionButton>
          ) : null}
        </div>
      </article>
      <MeetingAlertDialog {...alertDialogProps} />
    </>
  );
}

function IconActionButton({
  label,
  disabled,
  tone = "default",
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  tone?: "default" | "danger";
  onClick: () => void;
  children: ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      : "hover:border-blue-200 hover:bg-blue-50 hover:text-[#0052CC]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
