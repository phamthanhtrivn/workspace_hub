"use client";

import { IconButton } from "@/components/ui/icon-button";

import { QueryFeedback } from "@/components/common/query-feedback";
import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import {
  getChannelThreads,
  getDirectConversationThreads,
} from "../../../api/chat.api";
import { useChatMemberProfiles } from "../../../hooks/useChatMemberProfiles";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setActiveThreadRootMessage } from "@/store/chat/chat-slice";
import { Filter, X, MessageSquare, User, MessageCircle } from "lucide-react";
import Image from "next/image";
import { formatDateTime } from "@/lib/date";
import { useActiveChat } from "../../../hooks/useChatQueries";
import { ChatScope, chatKeys } from "../../../types/chat.constant";
import { logApiError } from "@/lib/interceptors";
import ThreadSnippetPreview from "./thread-snippet-preview";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom/custom-select";


interface ThreadsListViewProps {
  conversationId: string;
  isDirect?: boolean;
  onClose: () => void;
}

export default function ThreadsListView({
  conversationId,
  isDirect = false,
  onClose,
}: ThreadsListViewProps) {
  const dispatch = useAppDispatch();
  const { activeChat: activeConversation } = useActiveChat();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const memberProfiles = useChatMemberProfiles() || {};
  const { ref: loadMoreRef, inView } = useInView();
  const [senderId, setSenderId] = useState("");

  const senderOptions = useMemo(() => {
    if (!isDirect || !activeConversation?.members) return [];
    return activeConversation.members
      .map((member: any) => {
        const profile = memberProfiles[member.userId];
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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, isFetching, refetch } =
    useInfiniteQuery({
      queryKey: [
        ...chatKeys.threads(
          isDirect ? ChatScope.DIRECT : ChatScope.CHANNEL,
          conversationId,
        ),
        senderId || "all",
      ],
      queryFn: async ({ pageParam }) => {
        try {
          if (isDirect) {
            const res = await getDirectConversationThreads(
              conversationId,
              pageParam,
              20,
              senderId || undefined,
            );
            if (!res?.success) throw new Error("Could not load threads");
            return res?.success
              ? res.data
              : { messages: [], nextCursor: undefined };
          }

          const res = await getChannelThreads(conversationId);
          if (!res?.success) throw new Error("Could not load threads");
          return {
            messages: res?.success && Array.isArray(res.data) ? res.data : [],
            nextCursor: undefined,
          };
        } catch (error) {
          logApiError(
            error,
            isDirect
              ? "Failed to fetch direct message threads list"
              : "Failed to fetch channel threads list",
          );
          throw error;
        }
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage?.nextCursor,
      enabled: !!conversationId,
      retry: false,
      refetchInterval: 3000,
    });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

  const threads = data?.pages.flatMap((page) => page.messages || []) || [];

  const handleOpenThread = (message: any) => {
    dispatch(setActiveThreadRootMessage(message));
  };

  return (
    <div className="w-full h-full min-h-0 min-w-0 flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-info-content" />
          <h3 className="font-semibold text-foreground text-sm">
            Threads
          </h3>
        </div>
        <IconButton label="Close" showTooltip={false} size="icon-sm" aria-label="Close"
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-control text-muted-foreground hover:text-muted-foreground transition cursor-pointer"
        >
          <X size={18} />
        </IconButton>
      </div>

      {isError && threads.length > 0 && <QueryFeedback label="conversation threads" error retrying={isFetching} onRetry={() => refetch()} />}
      {isDirect && (
        <div className="px-4 py-3 border-b border-border shrink-0">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1.5">
            <Filter size={13} />
            Sender
          </label>
          <CustomSelect
            ariaLabel="Filter by sender"
            value={senderId}
            onChange={nextValue => setSenderId(nextValue)}
            triggerClassName="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-info-outline focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="">
              All Senders
            </option>
            {senderOptions.map((sender) => (
              <option key={sender.id} value={sender.id}>
                {sender.label}
              </option>
            ))}
          </CustomSelect>
        </div>
      )}

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {isError && threads.length === 0 ? <QueryFeedback label="conversation threads" error retrying={isFetching} onRetry={() => refetch()} /> : isLoading ? (
          <div className="text-center py-8 text-xs text-muted-foreground italic">
            Loading threads...
          </div>
        ) : threads.length > 0 ? (
          threads.map((msg: any) => {
            const sender = msg.senderProfile || memberProfiles[msg.senderId];
            const senderName =
              sender?.fullName || "User";
            const avatarUrl = sender?.avatarUrl;

            let lastReplyTimeStr = "";
            if (msg.threadLastReplyAt) {
              lastReplyTimeStr = formatDateTime(msg.threadLastReplyAt);
            }

            return (
              <Button variant="unstyled" type="button"
                key={msg.id}
                onClick={() => handleOpenThread(msg)}
                className="w-full text-left p-3 border border-border hover:border-border hover:bg-info-soft/20 rounded-panel cursor-pointer transition flex flex-col gap-2"
              >
                {/* Header info */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="Avatar"
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <User size={12} className="text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {senderName}
                  </span>
                </div>

                {/* Message body snippet */}
                <ThreadSnippetPreview content={msg.content} />

                {/* Footer status */}
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold pt-1 border-t border-border mt-1 shrink-0">
                  <span className="flex items-center gap-1 text-info-content font-semibold">
                    <MessageSquare size={12} />
                    {`${msg.threadReplyCount} ${msg.threadReplyCount === 1 ? "reply" : "replies"}`}
                  </span>
                  {lastReplyTimeStr && (
                    <span>
                      Last reply {lastReplyTimeStr}
                    </span>
                  )}
                </div>
              </Button>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-muted-foreground">
            <MessageSquare size={32} className="text-muted-foreground mb-2" />
            <p className="text-xs">
              No threads in this conversation yet.
            </p>
            <p className="text-xs text-muted-foreground max-w-[180px] mt-1">
              Reply to a message to start a discussion thread.
            </p>
          </div>
        )}
        <div ref={loadMoreRef} className="h-8 flex items-center justify-center">
          {isFetchingNextPage && (
            <span className="text-xs text-muted-foreground">
              Loading more...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
