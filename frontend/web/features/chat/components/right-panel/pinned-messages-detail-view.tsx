import { useEffect, useMemo } from "react";
import { ArrowLeft, Pin, X } from "lucide-react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { getBulkProfilesByIds, getPinnedMessages } from "../../api/chat.api";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import { UserProfileResponse } from "../../types/chat.types";
import { formatDateTime } from "@/lib/date";

interface PinnedMessagesDetailViewProps {
  conversationId: string;
  onBack: () => void;
  onJumpToMessage: (messageId: string) => void;
}

function getPinnedPreviewText(message: any) {
  if (message.content) return message.content;
  if (message.medias?.length) return "[Attachment]";
  if (message.poll) return "[Poll]";
  if (message.note) return "[Note]";
  return "[Message]";
}

function getInitial(name?: string | null) {
  return (name?.trim()?.charAt(0) || "U").toUpperCase();
}

export default function PinnedMessagesDetailView({
  conversationId,
  onBack,
  onJumpToMessage,
}: PinnedMessagesDetailViewProps) {
  const queryClient = useQueryClient();
  const { ref: loadMoreRef, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["pinnedMessagesDetail", conversationId],
    queryFn: async ({ pageParam }) => {
      const response = await getPinnedMessages(conversationId, pageParam, 20);
      return response.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

  const pinnedMessages = data?.pages.flatMap((page) => page?.messages || []) || [];
  const senderIds = useMemo<string[]>(
    () =>
      [
        ...new Set(
          pinnedMessages
            .map((message: any) => message.senderId)
            .filter((senderId: unknown): senderId is string => typeof senderId === "string" && senderId.length > 0),
        ),
      ].sort(),
    [pinnedMessages],
  );

  const { data: profilesResponse } = useQuery({
    queryKey: ["chat-pinned-message-profiles", senderIds],
    queryFn: async () => getBulkProfilesByIds(senderIds),
    enabled: senderIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const profilesById = useMemo(() => {
    const profiles: Record<string, UserProfileResponse> = {};
    if (profilesResponse?.success && Array.isArray(profilesResponse.data)) {
      profilesResponse.data.forEach((profile: UserProfileResponse) => {
        if (profile.id) {
          profiles[profile.id] = profile;
        }
      });
    }
    return profiles;
  }, [profilesResponse]);

  const handleUnpin = (messageId: string) => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit(ChatEvent.UNPIN_MESSAGE, {
      channelId: conversationId,
      messageId,
    });

    queryClient.setQueryData(["pinnedMessagesDetail", conversationId], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.filter((message: any) => message.id !== messageId),
        })),
      };
    });
    queryClient.invalidateQueries({ queryKey: ["pinnedMessagesPreview", conversationId] });
  };

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      <div className="h-16 px-4 border-b border-gray-200 flex items-center gap-3">
        <button
          onClick={onBack}
          className="cursor-pointer p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="font-semibold text-gray-800">Pinned messages</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-xs text-gray-400 py-6">Loading pinned messages...</div>
        ) : pinnedMessages.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-6">No pinned messages</div>
        ) : (
          <div className="space-y-2">
            {pinnedMessages.map((message: any) => (
              <div
                key={message.id}
                className="group flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3 hover:bg-gray-100 transition"
              >
                {profilesById[message.senderId]?.avatarUrl ? (
                  <img
                    src={profilesById[message.senderId].avatarUrl || ""}
                    alt={profilesById[message.senderId].fullName || "User"}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    {getInitial(profilesById[message.senderId]?.fullName)}
                  </div>
                )}
                <button
                  onClick={() => onJumpToMessage(message.id)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {profilesById[message.senderId]?.fullName || "User"}
                    </span>
                    
                  </div>
                  <div className="mt-1 text-sm text-gray-600 inline-flex items-center gap-2">
                    <span className="block truncate">{getPinnedPreviewText(message)}</span>
                    <span className="shrink-0 text-[11px] text-gray-400">
                      {formatDateTime(message.updatedAt)}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => handleUnpin(message.id)}
                  className="cursor-pointer rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                  title="Unpin"
                >
                 <Pin size={15} className="mt-1 shrink-0 text-blue-500" />
                </button>
              </div>
            ))}
            <div ref={loadMoreRef} className="h-8 flex items-center justify-center">
              {isFetchingNextPage && (
                <span className="text-xs text-gray-400">Loading more...</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
