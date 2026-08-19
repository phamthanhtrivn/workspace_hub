import { useState, useRef, useEffect, useCallback } from "react";
import { TYPING_TIMEOUT_MS } from "../types/chat.constant";
import { ChatProfilesMap } from "../types/chat.types";

export interface TypingUser {
  id: string;
  name: string;
}

/**
 * Quản lý danh sách người dùng đang gõ phím trong chat.
 *
 * - Thêm user vào danh sách khi nhận event TYPING với isTyping = true
 * - Tự động xoá sau TYPING_TIMEOUT_MS nếu không có event stop
 * - Xoá ngay khi nhận event với isTyping = false
 */
export function useChatTypingIndicator(
  currentUserId: string | null | undefined,
  memberProfiles: ChatProfilesMap,
  conversationId: string | undefined,
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Reset khi đổi conversation
  useEffect(() => {
    setTypingUsers([]);
    Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    typingTimeoutsRef.current = {};
  }, [conversationId]);

  const handleTypingEvent = useCallback(
    (data: {
      channelId?: string;
      conversationId?: string;
      userId?: string;
      isTyping: boolean;
    }) => {
      if (!data.userId || data.userId === currentUserId) return;

      const typingUserId = data.userId;

      if (data.isTyping) {
        setTypingUsers((prev) => {
          if (prev.find((u) => u.id === typingUserId)) return prev;
          const name = memberProfiles?.[typingUserId]?.fullName || "Someone";
          return [...prev, { id: typingUserId, name }];
        });

        if (typingTimeoutsRef.current[typingUserId]) {
          clearTimeout(typingTimeoutsRef.current[typingUserId]);
        }
        // Auto-remove sau TYPING_TIMEOUT_MS nếu không nhận được event stop
        typingTimeoutsRef.current[typingUserId] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== typingUserId));
          delete typingTimeoutsRef.current[typingUserId];
        }, TYPING_TIMEOUT_MS);
      } else {
        setTypingUsers((prev) => prev.filter((u) => u.id !== typingUserId));
        if (typingTimeoutsRef.current[typingUserId]) {
          clearTimeout(typingTimeoutsRef.current[typingUserId]);
          delete typingTimeoutsRef.current[typingUserId];
        }
      }
    },
    [currentUserId, memberProfiles],
  );

  return { typingUsers, handleTypingEvent };
}
