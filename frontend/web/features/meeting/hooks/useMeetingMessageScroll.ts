"use client";

import { useCallback, useRef } from "react";

export function useMeetingMessageScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;

    return (
      container.scrollHeight - container.scrollTop - container.clientHeight < 96
    );
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  return {
    containerRef,
    bottomRef,
    isNearBottom,
    scrollToBottom,
  };
}
