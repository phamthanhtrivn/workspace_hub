"use client";

import {
  GROUP_MESSAGES_THRESHOLD_MS,
  TIME_BLOCK_THRESHOLD_MS,
} from "../../types/chat.constant";
import ChatMessage from "./chat-message";
import TimeDivider from "./time-divider";
import { RenderableChatMessage, MemberProfilesMap } from "./chat-message.types";
import { LoadingState } from "@/components/ui/loading-state";

interface MessageListProps {
  messages: RenderableChatMessage[];
  isLoading: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
  loadMoreRef: (node: Element | null) => void;
  authUserId: string | null | undefined;
  activeChatType: string | null | undefined;
  memberProfiles: MemberProfilesMap;
  readReceipts: Record<string, string>;
  spaceCreatorId?: string;
  conversationMembers?: { userId: string; role?: "ADMIN" | "MEMBER" }[];
  onReact: (messageId: string, emoji: string, action: "add" | "remove") => void;
  onPollVote: (messageId: string, pollOptionId: string, selected?: boolean) => void | Promise<unknown>;
  onPollAddOption: (messageId: string, text: string) => void;
  onPollEdit: (
    messageId: string,
    title: string,
    multipleChoice: boolean,
    allowAddOptions: boolean,
    anonymous: boolean,
    isLocked: boolean,
  ) => void | Promise<unknown>;
  onNoteEdit: (messageId: string, title: string, content: string) => void;
  onEditMessage: (msg: RenderableChatMessage) => void;
  onRecallMessage: (msg: RenderableChatMessage) => void;
  onJumpToMessage: (messageId: string) => void;
  onPinMessage: (msg: RenderableChatMessage) => void;
  onThreadReply: (msg: RenderableChatMessage) => void;
  onReadMessage: (messageId: string) => void;
  onMarkDirectAsRead?: (conversationId: string, messageId: string) => void;
  conversationId?: string;
  isDirectConversation: boolean;
}

/**
 * Renders danh sách tin nhắn với time dividers, avatar logic, read receipts.
 * Giữ nguyên toàn bộ logic từ renderMessages() trong chat-area.tsx.
 *
 * Layout là flex-col-reverse nên mảng rendered được đọc từ dưới lên:
 * - index 0 = tin nhắn MỚI NHẤT (hiển thị ở cuối)
 * - index N = tin nhắn CŨ NHẤT (hiển thị ở đầu)
 */
export default function MessageList({
  messages,
  isLoading,
  hasNextPage,
  hasPreviousPage,
  isFetchingNextPage,
  isFetchingPreviousPage,
  loadMoreRef,
  authUserId,
  memberProfiles,
  readReceipts,
  spaceCreatorId,
  conversationMembers,
  onReact,
  onPollVote,
  onPollAddOption,
  onPollEdit,
  onNoteEdit,
  onEditMessage,
  onRecallMessage,
  onJumpToMessage,
  onPinMessage,
  onThreadReply,
  onReadMessage,
  onMarkDirectAsRead,
  conversationId,
  isDirectConversation,
}: MessageListProps) {
  if (isLoading) {
    return (
      <LoadingState label="Loading..." layout="centered" className="flex justify-center items-center h-full text-muted-foreground" />
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-full text-muted-foreground">
        No messages yet
      </div>
    );
  }

  const rendered: React.ReactNode[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;
    const prevMsg = i > 0 ? messages[i - 1] : null;

    const isMe = msg.senderId === authUserId;

    // Messages are stored newest first; nextMsg is the preceding visual message.
    const showSenderName = !nextMsg || nextMsg.senderId !== msg.senderId ||
      new Date(msg.createdAt).getTime() - new Date(nextMsg.createdAt).getTime() > GROUP_MESSAGES_THRESHOLD_MS ||
      nextMsg.type === "SYSTEM";
    const showAvatar = showSenderName;
    const showTime = showSenderName || !prevMsg || prevMsg.senderId !== msg.senderId;

    rendered.push(
      <ChatMessage
        key={msg.id}
        msg={msg}
        isMe={isMe}
        showAvatar={showAvatar}
        memberProfile={
          msg.senderProfile || memberProfiles?.[msg.senderId] || null
        }
        memberProfiles={memberProfiles || {}}
        memberRole={
          conversationMembers?.find((m) => m.userId === msg.senderId)?.role
        }
        spaceCreatorId={spaceCreatorId}
        readBy={Object.keys(readReceipts || {}).filter(
          (uid) => readReceipts[uid] === msg.id && uid !== authUserId,
        )}
        showTime={showTime}
        showSenderName={showSenderName}
        onReact={onReact}
        onPollVote={onPollVote}
        onPollAddOption={onPollAddOption}
        onPollEdit={onPollEdit}
        onNoteEdit={onNoteEdit}
        onEditMessage={onEditMessage}
        onRecallMessage={onRecallMessage}
        onJumpToMessage={onJumpToMessage}
        onPinMessage={onPinMessage}
        onThreadReply={onThreadReply}
      />,
    );

    // ── Mark as read: kích hoạt cho tin nhắn mới nhất chưa đọc ──────────
    if (!isMe && msg.id && conversationId && i === 0) {
      const myWatermark = readReceipts?.[authUserId || ""];
      if (myWatermark !== msg.id) {
        if (isDirectConversation) {
          onMarkDirectAsRead?.(conversationId, msg.id);
        } else {
          onReadMessage(msg.id);
        }
      }
    }

    // ── Time Divider: hiện phía trên khi đổi ngày hoặc khoảng cách >= 6h ─
    let showDividerAbove = false;
    if (!nextMsg) {
      showDividerAbove = true; // Luôn hiện trên tin nhắn cũ nhất
    } else {
      const currentMsgTime = new Date(msg.createdAt).getTime();
      const nextMsgTime = new Date(nextMsg.createdAt).getTime();
      if (currentMsgTime - nextMsgTime > TIME_BLOCK_THRESHOLD_MS) {
        showDividerAbove = true;
      } else {
        const currDate = new Date(msg.createdAt);
        const nextDate = new Date(nextMsg.createdAt);
        if (
          currDate.getDate() !== nextDate.getDate() ||
          currDate.getMonth() !== nextDate.getMonth() ||
          currDate.getFullYear() !== nextDate.getFullYear()
        ) {
          showDividerAbove = true;
        }
      }
    }

    if (showDividerAbove) {
      rendered.push(
        <TimeDivider key={`divider-${msg.id}`} date={msg.createdAt} />,
      );
    }
  }

  // Load more ref ở cuối mảng (visually ở đầu do flex-col-reverse)
  if (hasNextPage) {
    rendered.push(
      <div
        key="load-more"
        ref={loadMoreRef}
        className="h-6 w-full flex justify-center items-center my-2"
      >
        {isFetchingNextPage && (
          <LoadingState label="Loading more messages..." className="text-xs text-muted-foreground" />
        )}
      </div>,
    );
  }

  if (hasPreviousPage) {
    rendered.unshift(
      <div
        key="load-more-newer"
        className="h-6 w-full flex justify-center items-center my-2 shrink-0"
      >
        {isFetchingPreviousPage && (
          <LoadingState label="Loading new messages..." className="text-xs text-muted-foreground" />
        )}
      </div>,
    );
  }

  return <>{rendered}</>;
}
