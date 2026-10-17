"use client";

import React from "react";
import { Video, ExternalLink, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import { formatDateTime } from "@/lib/date";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { MeetingResponse, ChatMessageResponse } from "../../types/chat.types";
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
  const router = useRouter();
  const currentUser = useAppSelector((state) => state.auth);
  const memberProfiles = useChatMemberProfiles();

  const meeting = propMeeting || (message.meeting as MeetingResponse | null);

  const senderId = message.senderId;
  const isMe = Boolean(
    senderId && currentUser?.userId && senderId === currentUser.userId,
  );
  const senderProfile =
    message.senderProfile || (senderId ? memberProfiles?.[senderId] : null);
  const senderName =
    senderProfile?.fullName ||
    senderProfile?.email ||
    (isMe ? currentUser?.fullName || currentUser?.email : null) ||
    "User";

  const joinToken = meeting?.joinToken;
  const meetingTitle =
    meeting?.title || "Video Meeting";
  const isLive = meeting?.status === "LIVE" || (!meeting?.status && Boolean(message.meeting));
  const isEnded = meeting?.status === "ENDED";
  const startedAtFormatted = message.createdAt
    ? formatDateTime(message.createdAt)
    : "";

  const handleJoinInApp = () => {
    if (isEnded) {
      toast.info("This meeting has already ended.");
      return;
    }

    if (joinToken) {
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "";
      const returnUrlQuery = currentPath
        ? `?returnUrl=${encodeURIComponent(currentPath)}`
        : "";
      router.push(`/meetings/${encodeURIComponent(joinToken)}${returnUrlQuery}`);
    }
  };

  const handleOpenNewTab = () => {
    if (isEnded) {
      toast.info("This meeting has already ended.");
      return;
    }

    if (joinToken) {
      window.open(`/meetings/${encodeURIComponent(joinToken)}`, "_blank");
    }
  };

  return (
    <div className="flex flex-col items-center my-3 w-full">
      <div className="bg-card border border-border rounded-panel p-4 max-w-md w-full relative transition-all duration-200 hover:border-info">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-info-soft text-info border border-border p-2.5 rounded-panel shrink-0">
              <Video size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm md:text-base font-semibold text-foreground leading-tight truncate">
                {meetingTitle}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium truncate">
                Started by {senderName}{" "}
                {startedAtFormatted ? `• ${startedAtFormatted}` : ""}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="shrink-0">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-soft text-success border border-border">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                ENDED
              </span>
            )}
          </div>
        </div>

        {/* Action buttons or Ended status text */}
        {isLive ? (
          <div className="flex items-center gap-2 pt-2.5 border-t border-border">
            <button
              type="button"
              onClick={handleJoinInApp}
              disabled={!joinToken}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-control bg-primary hover:bg-primary active:bg-primary text-primary-foreground font-semibold text-xs md:text-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={15} className="fill-current" />
              <span>Join Now</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewTab}
              disabled={!joinToken}
              title="Open in new tab"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-control bg-muted hover:bg-accent text-foreground border border-border font-medium text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ExternalLink size={15} />
              <span className="hidden sm:inline">
                Open in new tab
              </span>
            </button>
          </div>
        ) : (
          <div className="pt-2.5 border-t border-border text-center">
            <span className="text-xs font-semibold text-muted-foreground py-1 inline-block">
              This meeting has ended
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export default MeetingCardMessage;
