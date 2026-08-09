import { ChevronDown, ChevronRight, MessageCircle, MessageSquare, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { formatDateTime } from "@/lib/date";
import {
  getConversationThreads,
  getDirectConversationThreads,
} from "../../api/chat.api";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";

interface ThreadsSectionProps {
  conversationId: string;
  isDirect?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSeeAll: () => void;
  onOpenThread: (message: any) => void;
}

export default function ThreadsSection({
  conversationId,
  isDirect = false,
  isExpanded,
  onToggle,
  onSeeAll,
  onOpenThread,
}: ThreadsSectionProps) {
  const memberProfiles = useChatMemberProfiles() || {};

  const { data: threads, isLoading } = useQuery({
    queryKey: ["conversation-threads", isDirect ? "direct" : "channel", conversationId],
    queryFn: async () => {
      const fetchThreads = isDirect
        ? getDirectConversationThreads
        : getConversationThreads;
      const res = await fetchThreads(conversationId);
      return res?.success ? res.data : [];
    },
    enabled: isExpanded && !!conversationId,
    refetchInterval: 3000,
  });

  const previewThreads = (threads || []).slice(0, 5);
  const hasMore = (threads || []).length > 5;

  return (
    <div>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
          <MessageCircle size={18} className="text-gray-500" />
          Threads
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
            <div className="text-xs text-gray-400 py-2">Loading threads...</div>
          ) : previewThreads.length === 0 ? (
            <div className="text-xs text-gray-400 py-2">No threads yet</div>
          ) : (
            <div className="space-y-1">
              {previewThreads.map((message: any) => {
                const profile = memberProfiles[message.senderId];
                const name = profile?.fullName || "User";
                const lastReplyTime = message.threadLastReplyAt
                  ? formatDateTime(message.threadLastReplyAt)
                  : null;

                return (
                  <button
                    key={message.id}
                    onClick={() => onOpenThread(message)}
                    className="w-full cursor-pointer flex items-start gap-2 rounded-lg p-2 text-left hover:bg-gray-100 transition"
                  >
                    <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center">
                      {profile?.avatarUrl ? (
                        <Image
                          src={profile.avatarUrl}
                          alt={name}
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <User size={13} className="text-gray-400" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-gray-800">
                        {name}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {message.content || "[Attachment]"}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-blue-600">
                        <MessageSquare size={11} />
                        {message.threadReplyCount} replies
                        {lastReplyTime && (
                          <span className="font-normal text-gray-400">· {lastReplyTime}</span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
              {hasMore && (
                <button
                  onClick={onSeeAll}
                  className="cursor-pointer w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-blue-600 hover:bg-blue-50 transition"
                >
                  See all threads
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
