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
import { ChatQueryKey, ChatScope, chatKeys } from "../types/chat.constant";
import { ChatMessageResponse } from "../types/chat.types";
import { SendSocketMessageMedia } from "../types/chat-socket.types";
import { useDirectMessageSocket } from "./socket/useDirectMessageSocket";
import { useAppIntl } from "@/features/i18n/useAppIntl";

type MessageDirection = "older" | "newer" | "around";

interface SendDirectMessageParams {
  conversationId: string;
  content: string;
  medias?: SendSocketMessageMedia[];
  threadParentId?: string;
  mentions?: string[];
  onSent?: () => void;
}

function getErrorMessage(error: unknown, fallback: string) {
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

  return fallback;
}

function hasErrorMessage(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.length > 0
  );
}

export function useDirectMessageActions() {
  const intl = useAppIntl();
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
    }: SendDirectMessageParams): Promise<ChatMessageResponse | null> => {
      try {
        const sentMessage = await sendDirectSocketMessage({
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
        return sentMessage;
      } catch (error: unknown) {
        if (!hasErrorMessage(error)) {
          toast.error(intl.formatMessage({ id: "chat.failedSendMessage" }));
        }
        return null;
      }
    },
    [intl, queryClient, sendDirectSocketMessage],
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
            intl.formatMessage({ id: "chat.failedEditMessage" }),
          ),
        );
        return false;
      }
    },
    [intl, queryClient],
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
            intl.formatMessage({ id: "chat.failedRecallMessage" }),
          ),
        );
      }
    },
    [intl, queryClient],
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
            intl.formatMessage({ id: "chat.failedUpdatePin" }),
          ),
        );
      }
    },
    [intl, queryClient],
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
            intl.formatMessage({ id: "chat.failedUnpinMessage" }),
          ),
        );
      }
    },
    [intl, queryClient],
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
            intl.formatMessage({ id: "chat.failedReact" }),
          ),
        );
      }
    },
    [intl, queryClient],
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
