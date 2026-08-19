import { useCallback } from "react";
import { toast } from "sonner";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import { ChatContextType, ChatMessageResponse } from "../../types/chat.types";
import {
  ChatSocketAckResponse,
  SendSocketMessageMedia,
} from "../../types/chat-socket.types";
import { useAppSelector } from "@/store/store";

interface SendDirectSocketMessageParams {
  conversationId: string;
  content: string;
  medias?: SendSocketMessageMedia[];
  threadParentId?: string;
  mentions?: string[];
}

function getConnectedSocket() {
  const socket = socketService.getSocket();
  return socket?.connected ? socket : null;
}

export function useDirectMessageSocket() {
  const currentUserId = useAppSelector((state) => state.auth.userId);

  const sendMessage = useCallback((params: SendDirectSocketMessageParams) => {
    const socket = getConnectedSocket();
    if (!socket) {
      toast.error("Direct message socket is not connected");
      return Promise.reject(
        new Error("Direct message socket is not connected"),
      );
    }

    return new Promise<ChatMessageResponse>((resolve, reject) => {
      socket.emit(
        ChatEvent.SEND_DIRECT_MESSAGE,
        {
          ...params,
          chatId: params.conversationId,
          chatType: ChatContextType.DIRECT_MESSAGE,
        },
        (response: ChatSocketAckResponse<ChatMessageResponse>) => {
          if (response?.status === "success" && response.data) {
            resolve(response.data);
            return;
          }

          const message = response?.message || "Failed to send message";
          toast.error(message);
          reject(new Error(message));
        },
      );
    });
  }, []);

  const markAsRead = useCallback(
    (conversationId: string, messageId: string) => {
      const socket = getConnectedSocket();
      if (!socket) return;

      socket.emit(ChatEvent.READ_DIRECT_MESSAGE, {
        conversationId,
        chatId: conversationId,
        chatType: ChatContextType.DIRECT_MESSAGE,
        messageId,
      });
    },
    [],
  );

  const sendTyping = useCallback(
    (conversationId: string, isTyping: boolean) => {
      const socket = getConnectedSocket();
      if (!socket) return;

      socket.emit(ChatEvent.TYPING_DIRECT, {
        conversationId,
        chatId: conversationId,
        chatType: ChatContextType.DIRECT_MESSAGE,
        userId: currentUserId || "",
        isTyping,
      });
    },
    [currentUserId],
  );

  return {
    markAsRead,
    sendMessage,
    sendTyping,
  };
}
