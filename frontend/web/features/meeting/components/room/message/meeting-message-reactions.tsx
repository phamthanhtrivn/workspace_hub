"use client";

import { cn } from "@/lib/utils";
import type { MeetingMessageReactionResponse } from "../../../types/meeting.types";

interface MeetingMessageReactionsProps {
  reactions?: MeetingMessageReactionResponse[];
  currentUserId?: string | null;
  onReactionClick: (emoji: string, action: "add" | "remove") => void;
}

export function MeetingMessageReactions({
  reactions,
  currentUserId,
  onReactionClick,
}: MeetingMessageReactionsProps) {
  if (!reactions?.length) return null;

  const groupedReactions = reactions.reduce<
    Record<string, MeetingMessageReactionResponse[]>
  >((groups, reaction) => {
    groups[reaction.emoji] = groups[reaction.emoji] || [];
    groups[reaction.emoji].push(reaction);
    return groups;
  }, {});

  return (
    <div className="mt-1.5 flex min-w-0 max-w-full flex-wrap gap-1">
      {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => {
        const hasReacted = emojiReactions.some(
          (reaction) => reaction.userId === currentUserId,
        );

        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReactionClick(emoji, hasReacted ? "remove" : "add")}
            className={cn(
              "flex h-6 max-w-full min-w-0 cursor-pointer items-center gap-1 rounded-full border px-2 text-[11px] font-bold transition",
              hasReacted
                ? "border-sky-300/50 bg-sky-400/20 text-sky-100"
                : "border-white/10 bg-white/8 text-slate-200 hover:bg-white/12",
            )}
          >
            <span className="shrink-0">{emoji}</span>
            <span className="shrink-0">{emojiReactions.length}</span>
          </button>
        );
      })}
    </div>
  );
}
