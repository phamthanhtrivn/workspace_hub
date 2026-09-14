import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addDirectReaction,
  editDirectMessage,
  getDirectConversationMessages,
  markDirectConversationAsRead,
  pinDirectMessage,
  recallDirectMessage,
  sendDirectMessage,
  unpinDirectMessage,
} from "../api/chat.api";
import { ChatQueryKey, ChatScope, chatKeys } from "../types/chat.constant";
import { ChatMessageResponse } from "../types/chat.types";
import { SendSocketMessageMedia } from "../types/chat-socket.types";
import { useDirectMessageSocket } from "./socket/useDirectMessageSocket";
type MessageDirection = "older" | "newer" | "around";

interface SendDirectMessageParams {
  conversationId: string;
  content?: string;
  medias?: any[];
  threadParentId?: string;
  mentions?: string[];
  onSent?: () => void;
}

function getErrorMessage(error: any, fallback: string): string {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return fallback;
}

export function useDirectMessageActions() {
  const queryClient = useQueryClient();
  const {
    sendTyping: sendDirectSocketTyping,
  } = useDirectMessageSocket();

  const getMessages = useCallback(
    (
      conversationId: string,
      cursor?: string,
      limit?: number,
      direction?: MessageDirection,
    ) => {
      return getDirectConversationMessages(
        conversationId,
        cursor,
        limit,
        direction,
      );
    },
    [],
  );

  const invalidateDirectConversation = useCallback(
    (conversationId: string) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS],
      });
    },
    [queryClient],
  );

  const sendMessage = useCallback(
    async ({
      conversationId,
      content,
      medias,
      threadParentId,
      mentions,
      onSent,
    }: SendDirectMessageParams): Promise<ChatMessageResponse | null> => {
      try {
        const sentMessage = await sendDirectMessage(conversationId, {
          content,
          medias,
          threadParentId,
          mentions,
        });

        queryClient.invalidateQueries({
          queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS],
        });
        onSent?.();
        return sentMessage.data;
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Failed to send message"));
        return null;
      }
    },
    [queryClient],
  );

  const editMessage = useCallback(
    async (conversationId: string, messageId: string, content: string) => {
      try {
        await editDirectMessage(messageId, content);
        queryClient.invalidateQueries({
          queryKey: ["messages", conversationId],
        });
        return true;
      } catch (error: unknown) {
        toast.error(
          getErrorMessage(
            error,
            "Failed to edit message",
          ),
        );
        return false;
      }
    },
    [queryClient],
  );

  const recallMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      try {
        await recallDirectMessage(messageId);
        queryClient.invalidateQueries({
          queryKey: ["messages", conversationId],
        });
      } catch (error: unknown) {
        toast.error(
          getErrorMessage(
            error,
            "Failed to recall message",
          ),
        );
      }
    },
    [queryClient],
  );

  const togglePinMessage = useCallback(
    async (
      conversationId: string,
      message: { id: string; pinned?: boolean },
    ) => {
      try {
        await (message.pinned ? unpinDirectMessage : pinDirectMessage)(
          message.id,
        );
        queryClient.invalidateQueries({
          queryKey: ["messages", conversationId],
        });
        queryClient.invalidateQueries({
          queryKey: chatKeys.pinnedMessagesPreview(
            ChatScope.DIRECT,
            conversationId,
          ),
        });
        queryClient.invalidateQueries({
          queryKey: chatKeys.pinnedMessagesDetail(
            ChatScope.DIRECT,
            conversationId,
          ),
        });
      } catch (error: unknown) {
        toast.error(
          getErrorMessage(
            error,
            "Failed to update pin status",
          ),
        );
      }
    },
    [queryClient],
  );

  const unpinMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      try {
        await unpinDirectMessage(messageId);
        queryClient.invalidateQueries({
          queryKey: chatKeys.pinnedMessagesPreview(
            ChatScope.DIRECT,
            conversationId,
          ),
        });
        queryClient.invalidateQueries({
          queryKey: chatKeys.pinnedMessagesDetail(
            ChatScope.DIRECT,
            conversationId,
          ),
        });
      } catch (error: unknown) {
        toast.error(
          getErrorMessage(
            error,
            "Failed to unpin message",
          ),
        );
      }
    },
    [queryClient],
  );

  const reactToMessage = useCallback(
    async (conversationId: string, messageId: string, emoji: string) => {
      try {
        await addDirectReaction(messageId, emoji);
        queryClient.invalidateQueries({
          queryKey: ["messages", conversationId],
        });
      } catch (error: unknown) {
        toast.error(
          getErrorMessage(
            error,
            "Failed to react to message",
          ),
        );
      }
    },
    [queryClient],
  );

  const markAsRead = useCallback(
    async (conversationId: string, messageId: string) => {
      try {
        await markDirectConversationAsRead(conversationId, messageId);
      } catch {
        // Read receipts are best-effort; socket events keep the rest of the UI in sync.
      }
    },
    [],
  );

  const sendTyping = useCallback(
    (conversationId: string, isTyping: boolean) => {
      sendDirectSocketTyping(conversationId, isTyping);
    },
    [sendDirectSocketTyping],
  );

  return {
    editMessage,
    getMessages,
    invalidateDirectConversation,
    markAsRead,
    reactToMessage,
    recallMessage,
    sendMessage,
    sendTyping,
    togglePinMessage,
    unpinMessage,
  };
}
