import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addDirectReaction,
  editDirectMessage,
  getDirectConversationMessages,
  pinDirectMessage,
  recallDirectMessage,
  unpinDirectMessage,
} from "../api/chat.api";
import { ChatQueryKey } from "../types/chat.constant";
import { useDirectMessageSocket } from "./useDirectMessageSocket";

type MessageDirection = "older" | "newer" | "around";

interface SendDirectMessageParams {
  conversationId: string;
  content: string;
  medias?: any[];
  threadParentId?: string;
  mentions?: string[];
  onSent?: () => void;
}

export function useDirectMessageActions() {
  const queryClient = useQueryClient();
  const {
    markAsRead: markDirectSocketAsRead,
    sendMessage: sendDirectSocketMessage,
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
    }: SendDirectMessageParams) => {
      try {
        await sendDirectSocketMessage({
          conversationId,
          content,
          medias,
          threadParentId,
          mentions,
        });

        queryClient.invalidateQueries({
          queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS],
        });
        onSent?.();
      } catch (error: any) {
        if (!error?.message) {
          toast.error("Failed to send message");
        }
      }
    },
    [queryClient, sendDirectSocketMessage],
  );

  const editMessage = useCallback(
    async (conversationId: string, messageId: string, content: string) => {
      try {
        await editDirectMessage(messageId, content);
        queryClient.invalidateQueries({
          queryKey: ["messages", conversationId],
        });
        return true;
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to edit message");
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
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to recall message");
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
          queryKey: ["pinnedMessagesPreview", "direct", conversationId],
        });
        queryClient.invalidateQueries({
          queryKey: ["pinnedMessagesDetail", "direct", conversationId],
        });
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to update pin");
      }
    },
    [queryClient],
  );

  const unpinMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      try {
        await unpinDirectMessage(messageId);
        queryClient.invalidateQueries({
          queryKey: ["pinnedMessagesPreview", "direct", conversationId],
        });
        queryClient.invalidateQueries({
          queryKey: ["pinnedMessagesDetail", "direct", conversationId],
        });
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to unpin message");
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
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to react");
      }
    },
    [queryClient],
  );

  const markAsRead = useCallback(
    (conversationId: string, messageId: string) => {
      markDirectSocketAsRead(conversationId, messageId);
    },
    [markDirectSocketAsRead],
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
