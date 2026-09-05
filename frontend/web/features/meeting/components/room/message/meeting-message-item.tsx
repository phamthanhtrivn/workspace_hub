"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, SmilePlus } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import type {
  MeetingMessageReactionResponse,
  MeetingMessageResponse,
  MeetingParticipantProfile,
} from "../../../types/meeting.types";
import { MeetingMessageAttachments } from "./meeting-message-attachments";
import { MeetingMessageOptionsMenu } from "./meeting-message-options-menu";
import { MeetingMessageReadReceipts } from "./meeting-message-read-receipts";
import { MeetingMessageReactions } from "./meeting-message-reactions";
import { MESSAGE_ACTION_WINDOW_MS, QUICK_REACTIONS } from "@/features/meeting/types/meeting.constants";

interface MeetingMessageItemProps {
  message: MeetingMessageResponse;
  currentUserId?: string | null;
  profile: MeetingParticipantProfile | null;
  showAvatar: boolean;
  showSenderName: boolean;
  readBy: string[];
  profilesByUserId: Record<string, MeetingParticipantProfile>;
  onReact: (messageId: string, emoji: string, action: "add" | "remove") => void;
  onEdit: (message: MeetingMessageResponse) => void;
  onRecall: (messageId: string) => void;
}

export function MeetingMessageItem({
  message,
  currentUserId,
  profile,
  showAvatar,
  showSenderName,
  readBy,
  profilesByUserId,
  onReact,
  onEdit,
  onRecall,
}: MeetingMessageItemProps) {
  const intl = useAppIntl();
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [optionsRect, setOptionsRect] = useState<DOMRect | null>(null);
  const [currentTime] = useState(() => Date.now());
  const isMe = message.senderId === currentUserId;
  const senderName =
    profile?.fullName || profile?.email || intl.formatMessage({ id: "meeting.chat.unknownUser" });
  const createdAtLabel = useMemo(
    () => formatDateTime(message.createdAt),
    [message.createdAt],
  );
  const isWithin24Hours = useMemo(
    () =>
      currentTime - new Date(message.createdAt).getTime() <=
      MESSAGE_ACTION_WINDOW_MS,
    [currentTime, message.createdAt],
  );
  const hasText = Boolean(message.content?.trim());
  const canEdit = isMe && hasText && !message.recalled && isWithin24Hours;
  const canRecall = isMe && !message.recalled && isWithin24Hours;

  const handleQuickReaction = (emoji: string) => {
    const hasReacted = message.reactions?.some(
      (reaction: MeetingMessageReactionResponse) =>
        reaction.userId === currentUserId && reaction.emoji === emoji,
    );
    onReact(message.id, emoji, hasReacted ? "remove" : "add");
    setIsReactionPickerOpen(false);
  };

  return (
    <div className={cn("group flex w-full min-w-0 gap-2", isMe && "justify-end")}>
      {!isMe && (
        <div className="w-8 shrink-0">
          {showAvatar && (
            <button
              type="button"
              className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-white/10 text-xs font-black text-slate-200 ring-1 ring-white/10"
              title={senderName}
            >
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={senderName}
                  className="h-full w-full object-cover"
                />
              ) : (
                senderName.charAt(0).toUpperCase()
              )}
            </button>
          )}
        </div>
      )}

      <div
        className={cn(
          "relative flex w-[82%] min-w-0 flex-col",
          isMe ? "items-end" : "items-start",
        )}
        onMouseLeave={() => setIsReactionPickerOpen(false)}
      >
        {showSenderName && !isMe && (
          <div className="mb-1 flex max-w-full items-baseline gap-2 px-1">
            <span className="truncate text-xs font-black text-slate-200">
              {senderName}
            </span>
            <span className="shrink-0 text-[10px] font-semibold text-slate-500">
              {createdAtLabel}
            </span>
          </div>
        )}

        {message.recalled ? (
          <div className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm italic text-slate-500">
            {intl.formatMessage({ id: "meeting.chat.messageRecalled" })}
          </div>
        ) : (
          <>
            <MeetingMessageAttachments medias={message.medias} isMe={isMe} />

            {hasText && (
              <div
                className={cn(
                  "mt-1 max-w-full whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm font-semibold leading-6 shadow-sm",
                  isMe
                    ? "rounded-br-md bg-sky-500 text-white"
                    : "rounded-bl-md border border-white/10 bg-white/10 text-slate-100",
                )}
              >
                {message.content}
              </div>
            )}

            <MeetingMessageReactions
              reactions={message.reactions}
              currentUserId={currentUserId}
              onReactionClick={(emoji, action) =>
                onReact(message.id, emoji, action)
              }
            />
          </>
        )}

        <div
          className={cn(
            "mt-1 flex items-center gap-1 px-1 text-[10px] font-semibold text-slate-500",
            isMe ? "justify-end" : "justify-start",
          )}
        >
          {(!showSenderName || isMe) && <span>{createdAtLabel}</span>}
          {message.edited && (
            <span>{intl.formatMessage({ id: "meeting.chat.edited" })}</span>
          )}
        </div>

        {isMe && (
          <MeetingMessageReadReceipts
            readBy={readBy}
            currentUserId={currentUserId}
            profilesByUserId={profilesByUserId}
          />
        )}

        {!message.recalled && (
          <div
            className={cn(
              "absolute top-full z-[90] mt-1 flex w-max max-w-full flex-wrap items-center gap-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100",
              isMe ? "right-0 justify-end" : "left-0 justify-start",
            )}
          >
            <div className="flex min-w-0 max-w-full items-center gap-1">
              <button
                type="button"
                onClick={() => setIsReactionPickerOpen((value) => !value)}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-white/10 bg-[#111827] text-slate-300 shadow-lg transition"
                title={intl.formatMessage({ id: "meeting.chat.react" })}
              >
                <SmilePlus className="h-4 w-4" />
              </button>
              {isReactionPickerOpen && (
                <div
                  className={cn(
                    "flex min-w-0 max-w-[calc(100%-1.5rem)] flex-wrap gap-0.5 rounded-2xl border border-white/10 bg-[#111827] p-1 shadow-2xl",
                    isMe ? "justify-end" : "justify-start",
                  )}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleQuickReaction(emoji)}
                      className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-base transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(canEdit || canRecall) && (
              <button
                type="button"
                onClick={(event) => {
                  setOptionsRect(event.currentTarget.getBoundingClientRect());
                  setIsOptionsOpen(true);
                }}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-white/10 bg-[#111827] text-slate-300 shadow-lg transition"
                title={intl.formatMessage({ id: "meeting.chat.moreActions" })}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <MeetingMessageOptionsMenu
        isOpen={isOptionsOpen}
        buttonRect={optionsRect}
        onClose={() => setIsOptionsOpen(false)}
        onEdit={() => onEdit(message)}
        onRecall={() => onRecall(message.id)}
        canEdit={canEdit}
        canRecall={canRecall}
      />
    </div>
  );
}
