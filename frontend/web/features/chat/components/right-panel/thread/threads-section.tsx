import {
  ChevronDown,
  ChevronRight,
  MessageCircle,
  MessageSquare,
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { formatDateTime } from "@/lib/date";
import {
  getChannelThreads,
  getDirectConversationThreads,
} from "../../../api/chat.api";
import { useChatMemberProfiles } from "../../../hooks/useChatMemberProfiles";
import { ChatScope, chatKeys } from "../../../types/chat.constant";
import SeeAllButton from "../see-all-button";
import { logApiError } from "@/lib/interceptors";
import ThreadSnippetPreview from "./thread-snippet-preview";

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

  const { data, isLoading } = useQuery({
    queryKey: chatKeys.threads(
      isDirect ? ChatScope.DIRECT : ChatScope.CHANNEL,
      conversationId,
    ),
    queryFn: async () => {
      try {
        const res = isDirect
          ? await getDirectConversationThreads(conversationId, undefined, 5)
          : await getChannelThreads(conversationId);
        if (!res?.success) return { threads: [], nextCursor: undefined };
        if (Array.isArray(res.data)) {
          return {
            threads: res.data.slice(0, 5),
            nextCursor: res.data.length > 5 ? res.data[5]?.id : undefined,
          };
        }
        return {
          threads: res.data.messages || [],
          nextCursor: res.data.nextCursor,
        };
      } catch (error) {
        logApiError(
          error,
          isDirect
            ? "Failed to fetch direct message threads"
            : "Failed to fetch channel threads",
        );
        return { threads: [], nextCursor: undefined };
      }
    },
    enabled: isExpanded && !!conversationId,
    retry: false,
    refetchInterval: 3000,
  });

  const previewThreads = data?.threads || [];
  const hasMore = !!data?.nextCursor;

  return (
    <div>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-background transition"
      >
        <div className="flex items-center gap-3 text-foreground font-medium text-sm">
          <MessageCircle size={18} className="text-muted-foreground" />
          Threads
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={16} className="text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3">
          {isLoading ? (
            <div className="text-xs text-muted-foreground py-2">
              Loading threads...
            </div>
          ) : previewThreads.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">
              No threads yet
            </div>
          ) : (
            <div className="space-y-1">
              {previewThreads.map((message: any) => {
                const profile =
                  message.senderProfile || memberProfiles[message.senderId];
                const name =
                  profile?.fullName || "User";
                const lastReplyTime = message.threadLastReplyAt
                  ? formatDateTime(message.threadLastReplyAt)
                  : null;

                return (
                  <button
                    key={message.id}
                    onClick={() => onOpenThread(message)}
                    className="w-full cursor-pointer flex items-start gap-2 rounded-control p-2 text-left hover:bg-muted transition"
                  >
                    <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                      {profile?.avatarUrl ? (
                        <Image
                          src={profile.avatarUrl}
                          alt={name}
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <User size={13} className="text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-foreground">
                        {name}
                      </span>
                      <ThreadSnippetPreview content={message.content} />
                      <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-info">
                        <MessageSquare size={11} />
                        {`${message.threadReplyCount} ${message.threadReplyCount === 1 ? "reply" : "replies"}`}
                        {lastReplyTime && (
                          <span className="font-normal text-muted-foreground">
                            · {lastReplyTime}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
              {hasMore && (
                <SeeAllButton onClick={onSeeAll} className="mt-2">
                  See all threads
                </SeeAllButton>
              )}
            </div>
          )}
        </div>
      )}

      <div className="h-px bg-muted mx-4 my-1" />
    </div>
  );
}
