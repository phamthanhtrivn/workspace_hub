"use client";

import React from "react";
import { Video, ExternalLink, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/store";
import { formatDateTime } from "@/lib/date";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { MeetingResponse, ChatMessageResponse } from "../../types/chat.types";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface MeetingCardMessageProps {
  message: ChatMessageResponse;
  meeting?: MeetingResponse | null;
  onUserClick?: (userId: string) => void;
}

export const MeetingCardMessage = React.memo(function MeetingCardMessage({
  message,
  meeting: propMeeting,
  onUserClick,
}: MeetingCardMessageProps) {
  const intl = useAppIntl();
  const router = useRouter();
  const currentUser = useAppSelector((state) => state.auth);
  const memberProfiles = useChatMemberProfiles();

  const meeting = propMeeting || (message.meeting as MeetingResponse | null);

  const senderId = message.senderId;
  const isMe = senderId === currentUser?.userId;
  const senderProfile =
    message.senderProfile || (senderId ? memberProfiles?.[senderId] : null);
  const senderName =
    senderProfile?.fullName ||
    senderProfile?.email ||
    intl.formatMessage({ id: "app.user" });

  const joinToken = meeting?.joinToken;
  const meetingTitle =
    meeting?.title ||
    intl.formatMessage({ id: "chat.meeting.cardTitle" });
  const isLive = !meeting?.status || meeting?.status === "LIVE";
  const startedAtFormatted = message.createdAt
    ? formatDateTime(message.createdAt)
    : "";

  const handleJoinInApp = () => {
    if (joinToken) {
      router.push(`/meetings/${encodeURIComponent(joinToken)}`);
    }
  };

  const handleOpenNewTab = () => {
    if (joinToken) {
      window.open(`/meetings/${encodeURIComponent(joinToken)}`, "_blank");
    }
  };

  return (
    <div className="flex flex-col items-center my-3 w-full">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm max-w-md w-full relative transition-all duration-200 hover:border-blue-300 hover:shadow-md">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-blue-50 text-blue-600 border border-blue-100 p-2.5 rounded-xl shrink-0">
              <Video size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm md:text-base font-bold text-slate-900 leading-tight truncate">
                {meetingTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                {intl.formatMessage(
                  { id: "chat.meeting.startedBy" },
                  { name: senderName },
                )}{" "}
                {startedAtFormatted ? `• ${startedAtFormatted}` : ""}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="shrink-0">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {intl.formatMessage({ id: "chat.meeting.liveStatus" })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                {intl.formatMessage({ id: "chat.meeting.endedStatus" })}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleJoinInApp}
            disabled={!joinToken}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs md:text-sm transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={15} className="fill-current" />
            <span>{intl.formatMessage({ id: "chat.meeting.joinNow" })}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewTab}
            disabled={!joinToken}
            title={intl.formatMessage({ id: "chat.meeting.openNewTab" })}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 font-medium text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ExternalLink size={15} />
            <span className="hidden sm:inline">
              {intl.formatMessage({ id: "chat.meeting.openNewTab" })}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default MeetingCardMessage;
