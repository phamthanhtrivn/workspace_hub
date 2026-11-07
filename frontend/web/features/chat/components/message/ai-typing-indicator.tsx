"use client";

import { Bot } from "lucide-react";
import { AI_BOT } from "../../constants/chat-identity";

export default function AiTypingIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="ai-typing-indicator"
      className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
        <Bot className="size-4" />
      </span>
      <span>{AI_BOT.name} is typing</span>
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1 rounded-full bg-current motion-safe:animate-pulse"
            style={{ animationDelay: `${delay}ms`, animationDuration: "1s" }}
          />
        ))}
      </span>
    </div>
  );
}
