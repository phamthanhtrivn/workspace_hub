"use client";

import { useEffect } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { formatDividerTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import type {
  MeetingMessageResponse,
  MeetingParticipantProfile,
} from "../../../types/meeting.types";
import { MeetingMessageItem } from "./meeting-message-item";
import { MeetingMessageTimeDivider } from "./meeting-message-time-divider";

const GROUP_MESSAGES_THRESHOLD_MS = 5 * 60 * 1000;

interface MeetingMessageListProps {
  messages: MeetingMessageResponse[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadOlderRef: (node?: Element | null) => void;
  currentUserId?: string | null;
  profilesByUserId: Record<string, MeetingParticipantProfile>;
  readReceipts: Record<string, string>;
  onReact: (messageId: string, emoji: string, action: "add" | "remove") => void;
  onEdit: (message: MeetingMessageResponse) => void;
  onRecall: (messageId: string) => void;
  onReadMessage: (messageId: string) => void;
}

export function MeetingMessageList({
  messages,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  loadOlderRef,
  currentUserId,
  profilesByUserId,
  readReceipts,
  onReact,
  onEdit,
  onRecall,
  onReadMessage,
}: MeetingMessageListProps) {
  const intl = useAppIntl();

  useEffect(() => {
    const newestMessage = messages[messages.length - 1];
    if (!newestMessage || newestMessage.senderId === currentUserId) return;
    onReadMessage(newestMessage.id);
  }, [currentUserId, messages, onReadMessage]);

  if (isLoading) {
    return (
      <div className="grid flex-1 place-items-center text-sm font-bold text-slate-500">
        {intl.formatMessage({ id: "app.loading" })}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="grid flex-1 place-items-center px-6 text-center text-sm font-bold leading-6 text-slate-500">
        {intl.formatMessage({ id: "meeting.chat.empty" })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-1 py-3">
      {hasNextPage && (
        <div
          ref={loadOlderRef}
          className="grid h-8 place-items-center text-xs font-bold text-slate-500"
        >
          {isFetchingNextPage
            ? intl.formatMessage({ id: "meeting.chat.loadingOlder" })
            : null}
        </div>
      )}

      {messages.map((message, index) => {
        const previousMessage = messages[index - 1];
        const nextMessage = messages[index + 1];
        const previousTime = previousMessage
          ? new Date(previousMessage.createdAt).getTime()
          : 0;
        const currentTime = new Date(message.createdAt).getTime();
        const showDivider =
          !previousMessage ||
          formatDividerTime(previousMessage.createdAt) !==
            formatDividerTime(message.createdAt);
        const showAvatar =
          !previousMessage ||
          previousMessage.senderId !== message.senderId ||
          currentTime - previousTime > GROUP_MESSAGES_THRESHOLD_MS;
        const nextTime = nextMessage
          ? new Date(nextMessage.createdAt).getTime()
          : 0;
        const showSenderName =
          !nextMessage ||
          nextMessage.senderId !== message.senderId ||
          nextTime - currentTime > GROUP_MESSAGES_THRESHOLD_MS;
        const hasSenderChanged =
          Boolean(previousMessage) &&
          previousMessage?.senderId !== message.senderId;
        const readByNames = Object.entries(readReceipts)
          .filter(
            ([userId, messageId]) =>
              userId !== currentUserId && messageId === message.id,
          )
          .map(([userId]) => {
            const profile = profilesByUserId[userId];
            return profile?.fullName || profile?.email || userId;
          });

        return (
          <div
            key={message.id}
            id={`meeting-msg-${message.id}`}
            className={cn("min-w-0", hasSenderChanged && "mt-4")}
          >
            {showDivider && (
              <MeetingMessageTimeDivider date={message.createdAt} />
            )}
            <MeetingMessageItem
              message={message}
              currentUserId={currentUserId}
              profile={
                message.senderProfile ||
                profilesByUserId[message.senderId] ||
                null
              }
              showAvatar={showAvatar}
              showSenderName={showSenderName}
              readByNames={readByNames}
              onReact={onReact}
              onEdit={onEdit}
              onRecall={onRecall}
            />
          </div>
        );
      })}
    </div>
  );
}
