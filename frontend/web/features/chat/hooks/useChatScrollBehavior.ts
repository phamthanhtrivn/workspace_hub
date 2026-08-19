import { useCallback, useRef } from "react";
import {
  JUMP_TO_MESSAGE_HIGHLIGHT_DURATION_MS,
  JUMP_TO_MESSAGE_SCROLL_DELAY_MS,
} from "../types/chat.constant";

export interface ChatScrollBehaviorRef {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  chatContainerRef: React.RefObject<HTMLDivElement>;
}

export interface UseChatScrollBehaviorReturn {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: () => void;
  handleJumpToMessage: (messageId: string, onNotFound?: (id: string) => void) => void;
}

/**
 * Quản lý hành vi scroll trong chat area:
 * - Scroll xuống cuối danh sách tin nhắn
 * - Jump to / highlight một tin nhắn theo ID
 */
export function useChatScrollBehavior(): UseChatScrollBehaviorReturn {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null!);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const highlightElement = useCallback((el: HTMLElement) => {
    el.classList.add("bg-blue-200", "transition-all", "duration-500");
    setTimeout(
      () => el.classList.remove("bg-blue-200"),
      JUMP_TO_MESSAGE_HIGHLIGHT_DURATION_MS,
    );
  }, []);

  const handleJumpToMessage = useCallback(
    (messageId: string, onNotFound?: (id: string) => void) => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        highlightElement(el);
      } else {
        // Phần tử chưa render — thông báo để component fetch thêm trang
        onNotFound?.(messageId);
        setTimeout(() => {
          const newEl = document.getElementById(`msg-${messageId}`);
          if (newEl) {
            newEl.scrollIntoView({ behavior: "auto", block: "center" });
            highlightElement(newEl);
          }
        }, JUMP_TO_MESSAGE_SCROLL_DELAY_MS);
      }
    },
    [highlightElement],
  );

  return {
    messagesEndRef,
    chatContainerRef,
    scrollToBottom,
    handleJumpToMessage,
  };
}
