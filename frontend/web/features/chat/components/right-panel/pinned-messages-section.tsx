import { ChevronDown, ChevronRight, Pin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPinnedMessages } from "../../api/chat.api";

interface PinnedMessagesSectionProps {
  conversationId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onSeeAll: () => void;
  onJumpToMessage: (messageId: string) => void;
}

function getPinnedPreviewText(message: any) {
  if (message.content) return message.content;
  if (message.medias?.length) return "[Attachment]";
  if (message.poll) return "[Poll]";
  if (message.note) return "[Note]";
  return "[Message]";
}

export default function PinnedMessagesSection({
  conversationId,
  isExpanded,
  onToggle,
  onSeeAll,
  onJumpToMessage,
}: PinnedMessagesSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["pinnedMessagesPreview", conversationId],
    queryFn: async () => {
      const response = await getPinnedMessages(conversationId, undefined, 5);
      return response.data;
    },
    enabled: isExpanded && !!conversationId,
    staleTime: 1000 * 60,
  });

  const pinnedMessages = data?.messages || [];

  return (
    <div>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
          <Pin size={18} className="text-gray-500" />
          Pinned messages
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3">
          {isLoading ? (
            <div className="text-xs text-gray-400 py-2">Loading pinned messages...</div>
          ) : pinnedMessages.length === 0 ? (
            <div className="text-xs text-gray-400 py-2">No pinned messages</div>
          ) : (
            <div className="space-y-1">
              {pinnedMessages.map((message: any) => (
                <button
                  key={message.id}
                  onClick={() => onJumpToMessage(message.id)}
                  className="w-full cursor-pointer flex items-start gap-2 rounded-lg p-2 text-left hover:bg-gray-100 transition"
                >
                  <Pin size={14} className="mt-0.5 shrink-0 text-blue-500" />
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-600">
                    {getPinnedPreviewText(message)}
                  </span>
                </button>
              ))}
              {data?.nextCursor && (
                <button
                  onClick={onSeeAll}
                  className="cursor-pointer w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-blue-600 hover:bg-blue-50 transition"
                >
                  See all pinned messages
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="h-px bg-gray-100 mx-4 my-1" />
    </div>
  );
}
