import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import {
  addChannelPollOption,
  editChannelMessage,
  editChannelNote,
  editChannelPoll,
  markChannelMessageAsRead,
  pinChannelMessage,
  reactChannelMessage,
  recallChannelMessage,
  sendChannelMessage,
  unpinChannelMessage,
  voteChannelPoll,
} from "../../api/chat.api";
import {
  ChatContextType,
  ChatMessageResponse,
  CreateNotePayload,
  CreatePollPayload,
} from "../../types/chat.types";
import { SendSocketMessageMedia } from "../../types/chat-socket.types";
import { ChatScope, chatKeys } from "../../types/chat.constant";
import { MessageType, ReactionAction } from "../../types/chat.enums";
import { useDirectMessageActions } from "../useDirectMessageActions";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export interface UseChatMessageActionsParams {
  conversationId: string | undefined;
  activeChatType: ChatContextType | null | undefined;
  isDirectConversation: boolean;
  jumpTargetId: string | null;
  appendRealtimeMessage: (message: ChatMessageResponse) => void;
  scrollToBottom: () => void;
}

/**
 * Tổng hợp tất cả hành động người dùng có thể thực hiện trên tin nhắn:
 * gửi, sửa, thu hồi, ghim, react, tạo poll/note, vote poll, v.v.
 *
 * Giữ nguyên toàn bộ logic từ chat-area.tsx — chỉ di chuyển vào hook riêng.
 */
export function useChatMessageActions({
  conversationId,
  activeChatType,
  isDirectConversation,
  jumpTargetId,
  appendRealtimeMessage,
  scrollToBottom,
}: UseChatMessageActionsParams) {
  const intl = useAppIntl();
  const queryClient = useQueryClient();
  const {
    editMessage: editDirectChatMessage,
    recallMessage: recallDirectChatMessage,
    reactToMessage: reactToDirectMessage,
    sendMessage: sendDirectChatMessage,
    togglePinMessage: toggleDirectPinMessage,
  } = useDirectMessageActions();

  const getErrorMessage = useCallback(
    (error: unknown, fallbackId: string) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
      ) {
        return error.response.data.message;
      }

      return intl.formatMessage({ id: fallbackId });
    },
    [intl],
  );

  // ─── Send / Edit ───────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (
      content: string,
      medias?: SendSocketMessageMedia[],
      mentions?: string[],
      editingMessage?: ChatMessageResponse | null,
      onEditDone?: () => void,
    ) => {
      if (!conversationId) return;

      if (editingMessage) {
        // ── Edit mode ──────────────────────────────────────────────────────
        if (isDirectConversation) {
          try {
            const edited = await editDirectChatMessage(
              conversationId,
              editingMessage.id,
              content,
            );
            if (edited) {
              onEditDone?.();
            }
          } catch {
            // error handled inside hook
          }
          return;
        }
        try {
          await editChannelMessage(editingMessage.id, content);
          queryClient.invalidateQueries({
            queryKey: chatKeys.messages(activeChatType, conversationId, jumpTargetId),
          });
          onEditDone?.();
        } catch (error: unknown) {
          toast.error(getErrorMessage(error, "chat.failedEditMessage"));
        }
        return;
      }

      // ── Send new message ───────────────────────────────────────────────
      if (isDirectConversation) {
        const sentMessage = await sendDirectChatMessage({
          conversationId,
          content,
          medias,
          mentions,
          onSent: () => {
            setTimeout(() => scrollToBottom(), 100);
          },
        });
        if (sentMessage) {
          appendRealtimeMessage(sentMessage);
        }
        return;
      }

      try {
        const response = await sendChannelMessage(conversationId, {
          content,
          medias,
          mentions,
        });

        if (response.data) {
          appendRealtimeMessage(response.data);
        }
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "chat.failedSendMessage"));
      }
    },
    [
      conversationId,
      activeChatType,
      jumpTargetId,
      queryClient,
      isDirectConversation,
      editDirectChatMessage,
      sendDirectChatMessage,
      appendRealtimeMessage,
      scrollToBottom,
      getErrorMessage,
    ],
  );

  // ─── Typing ────────────────────────────────────────────────────────────────

  const handleTypingChange = useCallback(
    (isTyping: boolean, userId?: string) => {
      const socket = socketService.getSocket();
      if (conversationId && isDirectConversation) {
        // DM typing handled in useDirectMessageActions
        return;
      }
      if (socket && conversationId) {
        socket.emit(ChatEvent.TYPING, {
          channelId: conversationId,
          chatId: conversationId,
          chatType: ChatContextType.CHANNEL,
          userId: userId || "",
          isTyping,
        });
      }
    },
    [conversationId, isDirectConversation],
  );

  // ─── Recall ────────────────────────────────────────────────────────────────

  const handleRecallMessage = useCallback(
    async (msg: ChatMessageResponse) => {
      if (!conversationId) return;

      if (isDirectConversation) {
        try {
          await recallDirectChatMessage(conversationId, msg.id);
        } catch {
          // error handled inside hook
        }
        return;
      }
      try {
        await recallChannelMessage(msg.id);
        queryClient.invalidateQueries({
          queryKey: chatKeys.messages(activeChatType, conversationId, jumpTargetId),
        });
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "chat.failedRecallMessage"));
      }
    },
    [
      activeChatType,
      conversationId,
      getErrorMessage,
      isDirectConversation,
      jumpTargetId,
      queryClient,
      recallDirectChatMessage,
    ],
  );

  // ─── Pin / Unpin ───────────────────────────────────────────────────────────

  const handlePinMessage = useCallback(
    async (msg: ChatMessageResponse) => {
      if (!conversationId) return;

      if (isDirectConversation) {
        try {
          await toggleDirectPinMessage(conversationId, msg);
        } catch {
          // error handled inside hook
        }
        return;
      }
      try {
        await (msg.pinned ? unpinChannelMessage : pinChannelMessage)(msg.id);
        queryClient.invalidateQueries({
          queryKey: chatKeys.pinnedMessagesPreview(ChatScope.CHANNEL, conversationId),
        });
        queryClient.invalidateQueries({
          queryKey: chatKeys.pinnedMessagesDetail(ChatScope.CHANNEL, conversationId),
        });
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "chat.failedUpdatePin"));
      }
    },
    [
      conversationId,
      getErrorMessage,
      isDirectConversation,
      queryClient,
      toggleDirectPinMessage,
    ],
  );

  // ─── React ─────────────────────────────────────────────────────────────────

  const handleReactMessage = useCallback(
    async (messageId: string, emoji: string, action: ReactionAction) => {
      if (conversationId && isDirectConversation) {
        try {
          await reactToDirectMessage(conversationId, messageId, emoji);
        } catch {
          // error handled inside hook
        }
        return;
      }
      if (!conversationId) return;
      try {
        await reactChannelMessage(messageId, emoji, action);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "chat.failedReact"));
      }
    },
    [
      conversationId,
      getErrorMessage,
      isDirectConversation,
      reactToDirectMessage,
    ],
  );

  // ─── Poll ──────────────────────────────────────────────────────────────────

  const handleCreatePoll = useCallback(
    async (data: CreatePollPayload) => {
      if (!conversationId) return;
      try {
        const response = await sendChannelMessage(conversationId, {
          content: "",
          type: MessageType.POLL,
          pollData: data,
        });
        if (response.data) {
          appendRealtimeMessage(response.data);
        }
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "chat.failedSendMessage"));
      }
    },
    [appendRealtimeMessage, conversationId, getErrorMessage],
  );

  const handlePollVoteMessage = useCallback(
    async (messageId: string, pollOptionId: string) => {
      if (!conversationId) return;
      try {
        await voteChannelPoll(conversationId, messageId, pollOptionId);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "chat.failedUpdatePoll"));
      }
    },
    [conversationId, getErrorMessage],
  );

  const handlePollAddOptionMessage = useCallback(
    async (messageId: string, text: string) => {
      if (!conversationId) return;
      try {
        await addChannelPollOption(conversationId, messageId, text);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "chat.failedUpdatePoll"));
      }
    },
    [conversationId, getErrorMessage],
  );

  const handlePollEditMessage = useCallback(
    async (
      messageId: string,
      title: string,
      multipleChoice: boolean,
      allowAddOptions: boolean,
      anonymous: boolean,
      isLocked: boolean,
    ) => {
      if (!conversationId) return;
      try {
        await editChannelPoll(conversationId, messageId, {
          title,
          multipleChoice,
          allowAddOptions,
          anonymous,
          isLocked,
        });
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "chat.failedUpdatePoll"));
      }
    },
    [conversationId, getErrorMessage],
  );

  // ─── Note ──────────────────────────────────────────────────────────────────

  const handleCreateNote = useCallback(
    async (data: CreateNotePayload) => {
      if (!conversationId) return;
      try {
        const response = await sendChannelMessage(conversationId, {
          content: "",
          type: MessageType.NOTE,
          noteData: data,
        });
        if (response.data) {
          appendRealtimeMessage(response.data);
        }
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "chat.failedSendMessage"));
      }
    },
    [appendRealtimeMessage, conversationId, getErrorMessage],
  );

  const handleNoteEditMessage = useCallback(
    async (messageId: string, title: string, content: string) => {
      if (!conversationId) return;
      try {
        await editChannelNote(conversationId, messageId, {
          title,
          content,
        });
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "chat.failedUpdateNote"));
      }
    },
    [conversationId, getErrorMessage],
  );

  // ─── Read Message ──────────────────────────────────────────────────────────

  const handleReadMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId || isDirectConversation) return;
      try {
        await markChannelMessageAsRead(conversationId, messageId);
      } catch {
        // Read receipts are best-effort; socket events keep the rest of the UI in sync.
      }
    },
    [conversationId, isDirectConversation],
  );

  return {
    handleSendMessage,
    handleTypingChange,
    handleRecallMessage,
    handlePinMessage,
    handleReactMessage,
    handleCreatePoll,
    handlePollVoteMessage,
    handlePollAddOptionMessage,
    handlePollEditMessage,
    handleCreateNote,
    handleNoteEditMessage,
    handleReadMessage,
  };
}
