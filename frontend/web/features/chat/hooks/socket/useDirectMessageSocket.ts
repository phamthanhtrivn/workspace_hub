import { useCallback } from "react";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import { ChatContextType } from "../../types/chat.types";
import { useAppSelector } from "@/store/store";

function getConnectedSocket() {
  const socket = socketService.getSocket();
  return socket?.connected ? socket : null;
}

export function useDirectMessageSocket() {
  const currentUserId = useAppSelector((state) => state.auth.userId);

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
    sendTyping,
  };
}
