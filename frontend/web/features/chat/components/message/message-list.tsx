"use client";

import {
  NO_AVATAR_TYPES,
  GROUP_MESSAGES_THRESHOLD_MS,
  TIME_BLOCK_THRESHOLD_MS,
} from "../../types/chat.constant";
import ChatMessage from "./chat-message";
import TimeDivider from "./time-divider";
import { RenderableChatMessage, MemberProfilesMap } from "./chat-message.types";

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
  onPollVote: (messageId: string, pollOptionId: string) => void;
  onPollAddOption: (messageId: string, text: string) => void;
  onPollEdit: (
    messageId: string,
    title: string,
    multipleChoice: boolean,
    allowAddOptions: boolean,
    anonymous: boolean,
    isLocked: boolean,
  ) => void;
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
  activeChatType,
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
      <div className="flex justify-center items-center h-full text-gray-400">
        Loading...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-full text-gray-400">
        No messages here yet. Say hello!
      </div>
    );
  }

  const rendered: React.ReactNode[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;
    const prevMsg = i > 0 ? messages[i - 1] : null;

    const isMe = msg.senderId === authUserId;

    // ── Xác định time block mới (cách prevMsg >= 6h hoặc khác ngày) ──────
    let isNewTimeBlockVisually = false;
    if (prevMsg) {
      const currentMsgTime = new Date(msg.createdAt).getTime();
      const prevMsgTime = new Date(prevMsg.createdAt).getTime();
      if (prevMsgTime - currentMsgTime > TIME_BLOCK_THRESHOLD_MS) {
        isNewTimeBlockVisually = true;
      } else {
        const currDate = new Date(msg.createdAt);
        const prevDate = new Date(prevMsg.createdAt);
        if (
          currDate.getDate() !== prevDate.getDate() ||
          currDate.getMonth() !== prevDate.getMonth() ||
          currDate.getFullYear() !== prevDate.getFullYear()
        ) {
          isNewTimeBlockVisually = true;
        }
      }
    }

    // ── Avatar: chỉ hiện ở đầu nhóm tin nhắn cùng người gửi ──────────────
    let showAvatar = false;
    if (!NO_AVATAR_TYPES.includes(msg.type)) {
      if (
        i === 0 ||
        messages[i - 1].senderId !== msg.senderId ||
        NO_AVATAR_TYPES.includes(messages[i - 1].type) ||
        isNewTimeBlockVisually
      ) {
        showAvatar = true;
      }
    }

    // ── Timestamp: ẩn nếu cùng người gửi và trong vòng 5 phút ───────────
    let showTime = true;
    if (prevMsg) {
      const currentMsgTime = new Date(msg.createdAt).getTime();
      const prevMsgTime = new Date(prevMsg.createdAt).getTime();
      if (
        prevMsg.senderId === msg.senderId &&
        prevMsgTime - currentMsgTime <= GROUP_MESSAGES_THRESHOLD_MS
      ) {
        showTime = false;
      }
    }

    // ── Tên người gửi: hiện dưới tin nhắn cuối cùng trong nhóm ──────────
    let showSenderName = false;
    if (!isMe || activeChatType === "CHANNEL") {
      if (!nextMsg) {
        showSenderName = true;
      } else {
        const currentMsgTime = new Date(msg.createdAt).getTime();
        const nextMsgTime = new Date(nextMsg.createdAt).getTime();
        if (
          nextMsg.senderId !== msg.senderId ||
          currentMsgTime - nextMsgTime > GROUP_MESSAGES_THRESHOLD_MS ||
          NO_AVATAR_TYPES.includes(nextMsg.type)
        ) {
          showSenderName = true;
        }
      }
    }

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
          <span className="text-xs text-gray-400">Loading more...</span>
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
          <span className="text-xs text-gray-400">Loading new messages...</span>
        )}
      </div>,
    );
  }

  return <>{rendered}</>;
}
