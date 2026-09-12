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
    <div className="flex flex-col items-center my-4 w-full">
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 rounded-2xl p-5 shadow-xl max-w-md w-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-indigo-400/50">
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2.5 rounded-2xl text-blue-400 border border-blue-500/30 shrink-0">
              <Video size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 leading-tight">
                {meetingTitle}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {intl.formatMessage({ id: "chat.meeting.liveStatus" })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                {intl.formatMessage({ id: "chat.meeting.endedStatus" })}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 relative z-10">
          <button
            type="button"
            onClick={handleJoinInApp}
            disabled={!joinToken}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} className="fill-current" />
            <span>{intl.formatMessage({ id: "chat.meeting.joinNow" })}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewTab}
            disabled={!joinToken}
            title={intl.formatMessage({ id: "chat.meeting.openNewTab" })}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ExternalLink size={16} />
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
