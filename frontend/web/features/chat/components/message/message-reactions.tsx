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
              "cursor-pointer flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border transition-all duration-150",
              userReacted
                ? "bg-blue-50 border-blue-200 text-blue-700 font-bold"
                : "bg-slate-50/60 border-slate-200/60 text-slate-600 hover:bg-slate-100 hover:text-slate-800",
            )}
          >
            <span>{emoji}</span>
            <span>{emojiReactions.length}</span>
          </button>
        );
      })}
      <button
        onClick={onOpenDetails}
        className="cursor-pointer text-[10px] text-slate-400 hover:text-slate-600 hover:underline px-2 py-0.5 transition"
      >
        Details
      </button>
    </div>
  );
}
