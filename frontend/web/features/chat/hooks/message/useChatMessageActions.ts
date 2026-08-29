import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { socketService } from "@/infrastructure/realtime/communication-socket.client";
import { ChatEvent } from "../../api/chat.events";
import {
  ChatContextType,
  ChatMessageResponse,
  CreateNotePayload,
  CreatePollPayload,
} from "../../types/chat.types";
import {
  ChatSocketAckResponse,
  SendSocketMessageMedia,
} from "../../types/chat-socket.types";
import { ChatScope, chatKeys } from "../../types/chat.constant";
import {
  SocketAckStatus,
  MessageType,
  ReactionAction,
} from "../../types/chat.enums";
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

  // ─── Send / Edit ───────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (
      content: string,
      medias?: SendSocketMessageMedia[],
      mentions?: string[],
      editingMessage?: ChatMessageResponse | null,
      onEditDone?: () => void,
    ) => {
      const socket = socketService.getSocket();
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
        if (!socket) {
          toast.error(intl.formatMessage({ id: "chat.connectionNotReady" }));
          return;
        }
        socket.emit(ChatEvent.EDIT_MESSAGE, {
          channelId: conversationId,
          messageId: editingMessage.id,
          content,
        });
        onEditDone?.();
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

      if (!socket) {
        toast.error(intl.formatMessage({ id: "chat.connectionNotReady" }));
        return;
      }
      socket.emit(
        ChatEvent.SEND_MESSAGE,
        {
          channelId: conversationId,
          chatId: conversationId,
          chatType: ChatContextType.CHANNEL,
          content,
          medias,
          mentions,
        },
        (response: ChatSocketAckResponse) => {
          if (response?.status === SocketAckStatus.SUCCESS && response.data) {
            appendRealtimeMessage(response.data);
          } else if (response?.message) {
            toast.error(response.message);
          }
        },
      );
    },
    [
      conversationId,
      intl,
      isDirectConversation,
      editDirectChatMessage,
      sendDirectChatMessage,
      appendRealtimeMessage,
      scrollToBottom,
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
      const socket = socketService.getSocket();
      if (!conversationId) return;

      if (isDirectConversation) {
        try {
          await recallDirectChatMessage(conversationId, msg.id);
        } catch {
          // error handled inside hook
        }
        return;
      }
      if (!socket) return;
      socket.emit(ChatEvent.RECALL_MESSAGE, {
        channelId: conversationId,
        messageId: msg.id,
      });
    },
    [conversationId, isDirectConversation, recallDirectChatMessage],
  );

  // ─── Pin / Unpin ───────────────────────────────────────────────────────────

  const handlePinMessage = useCallback(
    async (msg: ChatMessageResponse) => {
      const socket = socketService.getSocket();
      if (!conversationId) return;

      if (isDirectConversation) {
        try {
          await toggleDirectPinMessage(conversationId, msg);
        } catch {
          // error handled inside hook
        }
        return;
      }
      if (!socket) return;

      const pinEvent = msg.pinned
        ? ChatEvent.UNPIN_MESSAGE
        : ChatEvent.PIN_MESSAGE;
      socket.emit(
        pinEvent,
        {
          channelId: conversationId,
          chatId: conversationId,
          chatType: ChatContextType.CHANNEL,
          messageId: msg.id,
        },
        (response: ChatSocketAckResponse) => {
          if (response?.status === SocketAckStatus.ERROR) {
            toast.error(response.message);
          }
        },
      );
    },
    [conversationId, isDirectConversation, toggleDirectPinMessage],
  );

  // ─── React ─────────────────────────────────────────────────────────────────

  const handleReactMessage = useCallback(
    async (messageId: string, emoji: string, action: ReactionAction) => {
      const socket = socketService.getSocket();
      if (conversationId && isDirectConversation) {
        try {
          await reactToDirectMessage(conversationId, messageId, emoji);
        } catch {
          // error handled inside hook
        }
        return;
      }
      if (socket) {
        socket.emit(ChatEvent.REACT_MESSAGE, {
          channelId: conversationId,
          messageId,
          emoji,
          action,
        });
      }
    },
    [conversationId, isDirectConversation, reactToDirectMessage],
  );

  // ─── Poll ──────────────────────────────────────────────────────────────────

  const handleCreatePoll = useCallback(
    (data: CreatePollPayload) => {
      if (!conversationId) return;
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.SEND_MESSAGE, {
          channelId: conversationId,
          chatId: conversationId,
          chatType: ChatContextType.CHANNEL,
          content: "",
          type: MessageType.POLL,
          pollData: data,
        });
      }
    },
    [conversationId],
  );

  const handlePollVoteMessage = useCallback(
    (messageId: string, pollOptionId: string) => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.VOTE_POLL, {
          channelId: conversationId,
          messageId,
          pollOptionId,
        });
      }
    },
    [conversationId],
  );

  const handlePollAddOptionMessage = useCallback(
    (messageId: string, text: string) => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.ADD_POLL_OPTION, {
          channelId: conversationId,
          messageId,
          text,
        });
      }
    },
    [conversationId],
  );

  const handlePollEditMessage = useCallback(
    (
      messageId: string,
      title: string,
      multipleChoice: boolean,
      allowAddOptions: boolean,
      anonymous: boolean,
      isLocked: boolean,
    ) => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.EDIT_POLL, {
          channelId: conversationId,
          messageId,
          title,
          multipleChoice,
          allowAddOptions,
          anonymous,
          isLocked,
        });
      }
    },
    [conversationId],
  );

  // ─── Note ──────────────────────────────────────────────────────────────────

  const handleCreateNote = useCallback(
    (data: CreateNotePayload) => {
      if (!conversationId) return;
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.SEND_MESSAGE, {
          channelId: conversationId,
          chatId: conversationId,
          chatType: ChatContextType.CHANNEL,
          content: "",
          type: MessageType.NOTE,
          noteData: data,
        });
      }
    },
    [conversationId],
  );

  const handleNoteEditMessage = useCallback(
    (messageId: string, title: string, content: string) => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.EDIT_NOTE, {
          channelId: conversationId,
          messageId,
          title,
          content,
        });
      }
    },
    [conversationId],
  );

  // ─── Read Message ──────────────────────────────────────────────────────────

  const handleReadMessage = useCallback(
    (messageId: string) => {
      const socket = socketService.getSocket();
      if (!conversationId || isDirectConversation) return;
      if (!socket) return;
      socket.emit(ChatEvent.READ_MESSAGE, {
        channelId: conversationId,
        chatId: conversationId,
        chatType: ChatContextType.CHANNEL,
        messageId,
      });
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
