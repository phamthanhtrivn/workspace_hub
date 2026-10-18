"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, SmilePlus } from "lucide-react";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import type {
  MeetingMessageReactionResponse,
  MeetingMessageResponse,
  MeetingParticipantProfile,
} from "../../../types/meeting.types";
import { AvatarFallback } from "../../common/avatar-fallback";
import { MeetingMessageAttachments } from "./meeting-message-attachments";
import { MeetingMessageOptionsMenu } from "./meeting-message-options-menu";
import { MeetingMessageReadReceipts } from "./meeting-message-read-receipts";
import { MeetingMessageReactions } from "./meeting-message-reactions";
import { MESSAGE_ACTION_WINDOW_MS, QUICK_REACTIONS } from "@/features/meeting/types/meeting.constants";
import { MeetingIconButton } from "../../ui/meeting-icon-button";
import { Button } from "@/components/ui/button";


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
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [optionsRect, setOptionsRect] = useState<DOMRect | null>(null);
  const [currentTime] = useState(() => Date.now());
  const isMe = message.senderId === currentUserId;
  const senderName =
    profile?.fullName || profile?.email || "User";
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
            <Button variant="unstyled"
              type="button"
              className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-muted-foreground ring-1 ring-border/10"
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
                <AvatarFallback
                  label={senderName}
                  className="h-full w-full bg-accent/90 ring-0 shadow-none"
                  iconClassName="h-4 w-4 text-muted-foreground"
                />
              )}
            </Button>
          )}
        </div>
      )}

      <div
        className={cn(
          "flex w-[82%] min-w-0 flex-col",
          isMe ? "items-end" : "items-start",
        )}
        onMouseLeave={() => setIsReactionPickerOpen(false)}
      >
        {showSenderName && !isMe && (
          <div className="mb-1 flex max-w-full items-baseline gap-2 px-1">
            <span className="truncate text-xs font-semibold text-muted-foreground">
              {senderName}
            </span>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
              {createdAtLabel}
            </span>
          </div>
        )}

        {message.recalled ? (
          <div className="rounded-panel border border-border bg-accent px-3 py-2 text-sm italic text-muted-foreground">
            Message recalled
          </div>
        ) : (
          <>
            <MeetingMessageAttachments medias={message.medias} isMe={isMe} />

            {hasText && (
              <div
                className={cn(
                  "mt-1 max-w-full whitespace-pre-wrap break-words rounded-panel px-3 py-2 text-sm font-semibold leading-6",
                  isMe
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border bg-accent text-muted-foreground",
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
            "mt-1 flex items-center gap-1 px-1 text-xs font-semibold text-muted-foreground",
            isMe ? "justify-end" : "justify-start",
          )}
        >
          {(!showSenderName || isMe) && <span>{createdAtLabel}</span>}
          {message.edited && (
            <span>Edited</span>
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
              "mt-0 flex max-h-0 w-max max-w-full flex-wrap items-center gap-1 overflow-hidden opacity-0 transition-[max-height,margin,opacity] duration-150 focus-within:mt-1 focus-within:max-h-24 focus-within:opacity-100 group-hover:mt-1 group-hover:max-h-24 group-hover:opacity-100",
              isMe ? "justify-end" : "justify-start",
            )}
          >
            <div className="flex min-w-0 max-w-full items-center gap-1">
              <MeetingIconButton
                label="React"
                icon={SmilePlus}
                onClick={() => setIsReactionPickerOpen((value) => !value)}
                className="size-8 rounded-lg border border-border bg-card text-muted-foreground"
              />
              {isReactionPickerOpen && (
                <div
                  className={cn(
                    "flex min-w-0 max-w-[calc(100%-1.5rem)] flex-wrap gap-0.5 rounded-panel border border-border bg-card p-1",
                    isMe ? "justify-end" : "justify-start",
                  )}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <Button variant="unstyled"
                      key={emoji}
                      type="button"
                      onClick={() => handleQuickReaction(emoji)}
                      className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-base transition hover:bg-accent"
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {(canEdit || canRecall) && (
              <MeetingIconButton
                label="More actions"
                icon={MoreHorizontal}
                onClick={(event) => {
                  setOptionsRect(event.currentTarget.getBoundingClientRect());
                  setIsOptionsOpen(true);
                }}
                className="size-8 rounded-lg border border-border bg-card text-muted-foreground"
              />
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
