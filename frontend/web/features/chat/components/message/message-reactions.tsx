import { cn } from "@/lib/utils";
import { MessageReaction } from "./chat-message.types";

interface MessageReactionsProps {
  reactions?: MessageReaction[];
  currentUserId?: string | null;
  onReactionClick: (emoji: string) => void;
  onOpenDetails: () => void;
}

export default function MessageReactions({
  reactions,
  currentUserId,
  onReactionClick,
  onOpenDetails,
}: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) return null;

  const groupedReactions = reactions.reduce<Record<string, MessageReaction[]>>(
    (groups, reaction) => {
      groups[reaction.emoji] = groups[reaction.emoji] || [];
      groups[reaction.emoji].push(reaction);
      return groups;
    },
    {},
  );

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => {
        const userReacted = emojiReactions.some(
          (reaction) => reaction.userId === currentUserId,
        );

        return (
          <button
            key={emoji}
            onClick={() => onReactionClick(emoji)}
            className={cn(
              "cursor-pointer flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border transition-all duration-150",
              userReacted
                ? "bg-info-soft border-border text-info font-semibold"
                : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{emoji}</span>
            <span>{emojiReactions.length}</span>
          </button>
        );
      })}
      <button
        onClick={onOpenDetails}
        className="cursor-pointer text-xs text-muted-foreground hover:text-muted-foreground hover:underline px-2 py-0.5 transition"
      >
        Details
      </button>
    </div>
  );
}
