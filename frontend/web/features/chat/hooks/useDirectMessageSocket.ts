import { useCallback } from "react";
import { toast } from "sonner";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
import { ChatMessageResponse } from "../types/chat.types";

type DirectSocketResponse<T = unknown> = {
  status?: "success" | "error";
  message?: string;
  data?: T;
};

interface SendDirectSocketMessageParams {
  conversationId: string;
  content: string;
  medias?: any[];
  threadParentId?: string;
  mentions?: string[];
}

function getConnectedSocket() {
  const socket = socketService.getSocket();
  return socket?.connected ? socket : null;
}

export function useDirectMessageSocket() {
  const sendMessage = useCallback(
    (params: SendDirectSocketMessageParams) => {
      const socket = getConnectedSocket();
      if (!socket) {
        toast.error("Direct message socket is not connected");
        return Promise.reject(new Error("Direct message socket is not connected"));
      }

      return new Promise<ChatMessageResponse>((resolve, reject) => {
        socket.emit(
          ChatEvent.SEND_DIRECT_MESSAGE,
          params,
          (response: DirectSocketResponse<ChatMessageResponse>) => {
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
    },
    [],
  );

  const markAsRead = useCallback(
    (conversationId: string, messageId: string) => {
      const socket = getConnectedSocket();
      if (!socket) return;

      socket.emit(ChatEvent.READ_DIRECT_MESSAGE, {
        conversationId,
        messageId,
      });
    },
    [],
  );

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    const socket = getConnectedSocket();
    if (!socket) return;

    socket.emit(ChatEvent.TYPING_DIRECT, {
      conversationId,
      isTyping,
    });
  }, []);

  return {
    markAsRead,
    sendMessage,
    sendTyping,
  };
}
