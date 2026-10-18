import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Filter, Pin, Search } from "lucide-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import {
  getDirectPinnedMessages,
  getPinnedMessages,
  unpinChannelMessage,
} from "../../../api/chat.api";
import { formatDateTime } from "@/lib/date";
import { useDirectMessageActions } from "../../../hooks/useDirectMessageActions";
import { useAppSelector } from "@/store/store";
import { useChatMemberProfiles } from "../../../hooks/useChatMemberProfiles";
import { useActiveChat } from "../../../hooks/useChatQueries";
import { ChatScope, chatKeys } from "../../../types/chat.constant";
import { toast } from "sonner";

interface PinnedMessagesDetailViewProps {
  conversationId: string;
  isDirect?: boolean;
  onBack: () => void;
  onJumpToMessage: (messageId: string) => void;
}

function getPinnedPreviewText(message: any) {
  if (message.content) return message.content;
  if (message.medias?.length) return "Attachment";
  if (message.poll) return "Poll";
  if (message.note) return "Note";
  return "Message";
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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
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

  const pinnedMessages =
    data?.pages.flatMap((page) => page?.messages || []) || [];

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
              : profile?.fullName ||
                member.fullName ||
                "User",
        };
      })
      .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));
  }, [activeConversation?.members, currentUserId, isDirect, memberProfiles]);

  const handleUnpin = async (messageId: string) => {
    if (isDirect) {
      await unpinDirectPinnedMessage(conversationId, messageId);
      queryClient.setQueryData(
        chatKeys.pinnedMessagesDetail(ChatScope.DIRECT, conversationId),
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              messages: page.messages.filter(
                (message: any) => message.id !== messageId,
              ),
            })),
          };
        },
      );
      return;
    }

    try {
      await unpinChannelMessage(messageId);
    } catch {
      toast.error("Failed to unpin message");
      return;
    }

    queryClient.setQueryData(
      chatKeys.pinnedMessagesDetail(ChatScope.CHANNEL, conversationId),
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            messages: page.messages.filter(
              (message: any) => message.id !== messageId,
            ),
          })),
        };
      },
    );
    queryClient.invalidateQueries({
      queryKey: chatKeys.pinnedMessagesPreview(
        ChatScope.CHANNEL,
        conversationId,
      ),
    });
  };

  return (
    <div className="w-full h-full min-h-0 min-w-0 bg-card border-l border-border flex flex-col">
      <div className="min-h-16 shrink-0 flex-wrap gap-2 py-2 px-4 border-b border-border flex items-center gap-3">
        <button aria-label="Back"
          onClick={onBack}
          className="cursor-pointer p-2 hover:bg-muted rounded-full text-muted-foreground transition"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="font-semibold text-foreground">
          Pinned Messages
        </h2>
      </div>

      <div className="px-4 py-3 border-b border-border flex flex-col gap-3 shrink-0">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pinned messages..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-muted border border-transparent rounded-control focus:bg-card focus:border-info-outline focus:ring-1 focus:ring-ring outline-none transition"
          />
        </div>

        {isDirect && (
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1.5">
              <Filter size={13} />
              Sender
            </label>
            <select
              value={senderId}
              onChange={(event) => setSenderId(event.target.value)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-info-outline focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="">
                All Senders
              </option>
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
          <div className="text-center text-xs text-muted-foreground py-6">
            Loading pinned messages...
          </div>
        ) : pinnedMessages.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">
            {searchQuery
              ? "No matching pinned messages"
              : "No pinned messages"}
          </div>
        ) : (
          <div className="space-y-2">
            {pinnedMessages.map((message: any) => (
              <div
                key={message.id}
                className="group flex items-start gap-3 rounded-lg border border-border bg-background p-3 hover:bg-muted transition"
              >
                {message.senderProfile?.avatarUrl ? (
                  <img
                    src={message.senderProfile.avatarUrl || ""}
                    alt={
                      message.senderProfile.fullName || "User"
                    }
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info-soft text-sm font-semibold text-info-content">
                    {getInitial(message.senderProfile?.fullName)}
                  </div>
                )}
                <button
                  onClick={() => onJumpToMessage(message.id)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {message.senderProfile?.fullName || "User"}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground inline-flex items-center gap-2">
                    <span className="block truncate">
                      {getPinnedPreviewText(message)}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(message.updatedAt)}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => handleUnpin(message.id)}
                  className="cursor-pointer rounded-control p-1.5 text-muted-foreground hover:bg-destructive-soft hover:text-destructive-content transition"
                  title="Unpin"
                >
                  <Pin size={15} className="mt-1 shrink-0 text-info-content" />
                </button>
              </div>
            ))}
            <div
              ref={loadMoreRef}
              className="h-8 flex items-center justify-center"
            >
              {isFetchingNextPage && (
                <span className="text-xs text-muted-foreground">
                  Loading more...
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
