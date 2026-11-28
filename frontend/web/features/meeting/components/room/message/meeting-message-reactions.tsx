"use client";

import { cn } from "@/lib/utils";
import type { MeetingMessageReactionResponse } from "../../../types/meeting.types";
import { Button } from "@/components/ui/button";


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
          <Button variant="unstyled"
            key={emoji}
            type="button"
            onClick={() => onReactionClick(emoji, hasReacted ? "remove" : "add")}
            className={cn(
              "flex h-6 max-w-full min-w-0 cursor-pointer items-center gap-1 rounded-full border px-2 text-xs font-semibold transition",
              hasReacted
                ? "border-info-outline/50 bg-primary/20 text-info-content"
                : "border-border bg-accent text-muted-foreground hover:bg-accent",
            )}
          >
            <span className="shrink-0">{emoji}</span>
            <span className="shrink-0">{emojiReactions.length}</span>
          </Button>
        );
      })}
    </div>
  );
}
