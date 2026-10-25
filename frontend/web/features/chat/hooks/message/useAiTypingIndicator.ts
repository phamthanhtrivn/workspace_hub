"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/store";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import type { ChatSocketMessagePayload } from "../../types/chat-socket.types";
import { createAiTypingTracker } from "../../utils/ai-typing-tracker";

export function useAiTypingIndicator(
  chatId: string | null | undefined,
  chatType: string | null | undefined,
  threadParentId: string | null = null,
) {
  const token = useAppSelector((state) => state.auth.accessToken);
  const scopeKey = JSON.stringify([chatId, chatType, threadParentId, token]);
  const [status, setStatus] = useState({ scopeKey: "", active: false });

  useEffect(() => {
    if (!chatId || !chatType || !token) return;
    const socket = socketService.connect(token);
    const tracker = createAiTypingTracker(
      { chatId, chatType, threadParentId },
      (active) => setStatus((prev) =>
        prev.scopeKey === scopeKey && prev.active === active
          ? prev : { scopeKey, active }),
    );
    const onMessage = (message: ChatSocketMessagePayload) => {
      if (message.aiRequestId && message.senderId === "00000000-0000-4000-8000-0000000000a1") {
        tracker.receive({
          requestId: message.aiRequestId,
          chatId: message.chatId ?? message.channelId ?? message.conversationId ?? "",
          chatType: message.chatType!,
          threadParentId: message.threadParentId ?? null,
          isTyping: false,
        });
      }
    };
    socket.on(ChatEvent.AI_TYPING, tracker.receive);
    socket.on(ChatEvent.NEW_MESSAGE, onMessage);
    socket.on("disconnect", tracker.reset);
    return () => {
      socket.off(ChatEvent.AI_TYPING, tracker.receive);
      socket.off(ChatEvent.NEW_MESSAGE, onMessage);
      socket.off("disconnect", tracker.reset);
      tracker.reset();
    };
  }, [chatId, chatType, threadParentId, token, scopeKey]);

  return status.scopeKey === scopeKey && status.active;
}
