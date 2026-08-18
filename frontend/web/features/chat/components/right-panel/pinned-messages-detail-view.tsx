import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Filter, Pin, Search } from "lucide-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import {
  getDirectPinnedMessages,
  getPinnedMessages,
} from "../../api/chat.api";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import { formatDateTime } from "@/lib/date";
import { useDirectMessageActions } from "../../hooks/useDirectMessageActions";
import { useAppSelector } from "@/store/store";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { useActiveChat } from "../../hooks/useChatQueries";
import { ChatScope, chatKeys } from "../../types/chat.constant";

interface PinnedMessagesDetailViewProps {
  conversationId: string;
  isDirect?: boolean;
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
  isDirect = false,
  onBack,
  onJumpToMessage,
}: PinnedMessagesDetailViewProps) {
  const queryClient = useQueryClient();
  const { activeChat: activeConversation } = useActiveChat();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const { unpinMessage: unpinDirectPinnedMessage } = useDirectMessageActions();
  const { ref: loadMoreRef, inView } = useInView();
  const [senderId, setSenderId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const conversationMemberIds = useMemo(
    () =>
      activeConversation?.members
        ?.map((member: any) => member.userId)
        .filter(Boolean) || [],
    [activeConversation?.members],
  );
  const memberProfiles = useChatMemberProfiles(conversationMemberIds);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: [
      ...chatKeys.pinnedMessagesDetail(
        isDirect ? ChatScope.DIRECT : ChatScope.CHANNEL,
        conversationId,
      ),
      senderId || "all",
      debouncedSearchQuery || "",
    ],
    queryFn: async ({ pageParam }) => {
      const response = isDirect
        ? await getDirectPinnedMessages(
            conversationId,
            pageParam,
            20,
            senderId || undefined,
            debouncedSearchQuery,
          )
        : await getPinnedMessages(
            conversationId,
            pageParam,
            20,
            debouncedSearchQuery,
          );
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

  const senderOptions = useMemo(() => {
    if (!isDirect || !activeConversation?.members) return [];
    return activeConversation.members
      .map((member: any) => {
        const profile = memberProfiles[member.userId] || member.profile;
        return {
          id: member.userId,
          label:
            member.userId === currentUserId
              ? "You"
              : profile?.fullName || member.fullName || "User",
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [
    activeConversation?.members,
    currentUserId,
    isDirect,
    memberProfiles,
  ]);

  const handleUnpin = async (messageId: string) => {
    if (isDirect) {
      await unpinDirectPinnedMessage(conversationId, messageId);
      queryClient.setQueryData(chatKeys.pinnedMessagesDetail(ChatScope.DIRECT, conversationId), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            messages: page.messages.filter((message: any) => message.id !== messageId),
          })),
        };
      });
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit(ChatEvent.UNPIN_MESSAGE, {
      channelId: conversationId,
      messageId,
    });

    queryClient.setQueryData(chatKeys.pinnedMessagesDetail(ChatScope.CHANNEL, conversationId), (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.filter((message: any) => message.id !== messageId),
        })),
      };
    });
    queryClient.invalidateQueries({
      queryKey: chatKeys.pinnedMessagesPreview(
        ChatScope.CHANNEL,
        conversationId,
      ),
    });
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

      <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-3 shrink-0">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pinned messages..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          />
        </div>

        {isDirect && (
          <div>
            <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 mb-1.5">
              <Filter size={13} />
              Sender
            </label>
            <select
              value={senderId}
              onChange={(event) => setSenderId(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All senders</option>
              {senderOptions.map((sender) => (
                <option key={sender.id} value={sender.id}>
                  {sender.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-xs text-gray-400 py-6">Loading pinned messages...</div>
        ) : pinnedMessages.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-6">
            {searchQuery ? "No matching pinned messages found" : "No pinned messages"}
          </div>
        ) : (
          <div className="space-y-2">
            {pinnedMessages.map((message: any) => (
              <div
                key={message.id}
                className="group flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3 hover:bg-gray-100 transition"
              >
                {message.senderProfile?.avatarUrl ? (
                  <img
                    src={message.senderProfile.avatarUrl || ""}
                    alt={message.senderProfile.fullName || "User"}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    {getInitial(message.senderProfile?.fullName)}
                  </div>
                )}
                <button
                  onClick={() => onJumpToMessage(message.id)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {message.senderProfile?.fullName || "User"}
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
