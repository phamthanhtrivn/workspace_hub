"use client";

import { useEffect, type RefObject } from "react";
import { useAppSelector } from "@/store/store";

export function useThreadComposerFocus(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  threadId?: string,
) {
  const focusRequest = useAppSelector((state) => state.chat.threadFocusRequest);
  const isActiveThread = useAppSelector((state) => Boolean(
    threadId && state.chat.activeThreadRootMessageId === threadId &&
    state.chat.activeThreadChatId === state.chat.activeChatId,
  ));

  useEffect(() => {
    if (!isActiveThread) return;
    const focusComposer = () => {
      const textarea = textareaRef.current;
      if (textarea?.isConnected && !textarea.disabled)
        textarea.focus({ preventScroll: true });
    };
    focusComposer();
    // Portal/modal cleanup can restore its opener after the opening commit.
    const frame = requestAnimationFrame(focusComposer);
    return () => cancelAnimationFrame(frame);
  }, [focusRequest, isActiveThread, textareaRef]);
}
