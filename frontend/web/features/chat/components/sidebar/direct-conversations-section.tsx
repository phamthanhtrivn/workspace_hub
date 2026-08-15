"use client";

import { useMemo, useState } from "react";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  muteDirectConversation,
  pinDirectConversation,
} from "../../api/chat.api";
import { DirectMessage } from "../../types/chat.types";
import { ChatSidebarSection, chatKeys } from "../../types/chat.constant";
import DirectConversationItem from "./direct-conversation-item";
import { sortDirectConversations } from "../../utils/direct-conversation-utils";
import { cn } from "@/lib/utils";
import {
  DirectMessagesQueryData,
  useDirectMessagesQuery,
} from "../../hooks/useChatQueries";

const EMPTY_DIRECT_MESSAGES: DirectMessage[] = [];

interface DirectMessagesSectionProps {
  activeConversationId?: string;
  currentUserId: string | null;
  searchQuery: string;
  onCreateDirectConversation: () => void;
  onSelectConversation: (directMessage: DirectMessage) => void;
}

export default function DirectConversationsSection({
  activeConversationId,
  currentUserId,
  searchQuery,
  onCreateDirectConversation,
  onSelectConversation,
}: DirectMessagesSectionProps) {
  const queryClient = useQueryClient();
  const [isDmExpanded, setIsDmExpanded] = useState(true);
  const { data, isLoading, isFetching } = useDirectMessagesQuery(currentUserId);

  const directMessages = useMemo(
    () =>
      sortDirectConversations(
        data?.directMessages ?? EMPTY_DIRECT_MESSAGES,
        currentUserId,
      ),
    [currentUserId, data?.directMessages],
  );
  const isLoadingProfiles = isLoading || isFetching;

  const filteredDirectMessages = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (!trimmedQuery) return directMessages;

    return directMessages.filter((directMessage) => {
      const otherMember = directMessage.members?.find(
        (member) => member.userId !== currentUserId,
      );
      const profile = otherMember?.profile ?? null;
      const name = profile?.fullName || "User";
      return name.toLowerCase().includes(trimmedQuery);
    });
  }, [currentUserId, directMessages, searchQuery]);

  const updateDirectMessageMemberCache = (
    directMessageId: string,
    memberPatch: { pinned?: boolean; muted?: boolean },
  ) => {
    const queryKey = chatKeys.directMessages(currentUserId);
    queryClient.setQueryData<DirectMessagesQueryData>(queryKey, (oldData) => {
      if (!oldData) return oldData;

      const nextDirectMessages = sortDirectConversations(
        oldData.directMessages.map((directMessage) => {
          if (directMessage.id !== directMessageId) return directMessage;
          return {
            ...directMessage,
            members: directMessage.members.map((member) =>
              member.userId === currentUserId
                ? { ...member, ...memberPatch }
                : member,
            ),
          };
        }),
        currentUserId,
      );

      return { ...oldData, directMessages: nextDirectMessages };
    });
  };

  const pinMutation = useMutation({
    mutationFn: ({
      directMessageId,
      pinned,
    }: {
      directMessageId: string;
      pinned: boolean;
    }) => pinDirectConversation(directMessageId, pinned),
    onMutate: async ({ directMessageId, pinned }) => {
      const queryKey = chatKeys.directMessages(currentUserId);
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<DirectMessagesQueryData>(queryKey);

      updateDirectMessageMemberCache(directMessageId, { pinned });
      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          chatKeys.directMessages(currentUserId),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.directMessages(currentUserId),
      });
    },
  });

  const muteMutation = useMutation({
    mutationFn: ({
      directMessageId,
      muted,
    }: {
      directMessageId: string;
      muted: boolean;
    }) => muteDirectConversation(directMessageId, muted),
    onMutate: async ({ directMessageId, muted }) => {
      const queryKey = chatKeys.directMessages(currentUserId);
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<DirectMessagesQueryData>(queryKey);

      updateDirectMessageMemberCache(directMessageId, { muted });
      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          chatKeys.directMessages(currentUserId),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.directMessages(currentUserId),
      });
    },
  });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-3 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
        <button
          onClick={() => setIsDmExpanded(!isDmExpanded)}
          className="flex items-center gap-1 hover:text-slate-600 transition cursor-pointer text-left"
        >
          {isDmExpanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
          <span>{ChatSidebarSection.DIRECT_MESSAGES}</span>
        </button>
        <button
          onClick={onCreateDirectConversation}
          className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
          title="Find new chat"
        >
          <Plus size={14} />
        </button>
      </div>
      {isDmExpanded && (
        <div
          className={cn(
            "pr-1 flex flex-col gap-0.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full",
            filteredDirectMessages.length > 10 && "max-h-80 overflow-y-auto",
          )}
        >
          {isLoading ? (
            <div className="text-[11px] text-slate-400 italic px-3 py-1">
              Loading...
            </div>
          ) : filteredDirectMessages.length > 0 ? (
            filteredDirectMessages.map((directMessage) => (
              <DirectConversationItem
                key={directMessage.id}
                conversation={directMessage}
                currentUserId={currentUserId}
                isLoadingProfile={isLoadingProfiles}
                isActive={activeConversationId === directMessage.id}
                onClick={(selectedDirectMessage) =>
                  onSelectConversation(selectedDirectMessage)
                }
                onTogglePin={(selectedDirectMessage, pinned) =>
                  pinMutation.mutate({
                    directMessageId: selectedDirectMessage.id,
                    pinned,
                  })
                }
                onToggleMute={(selectedDirectMessage, muted) =>
                  muteMutation.mutate({
                    directMessageId: selectedDirectMessage.id,
                    muted,
                  })
                }
              />
            ))
          ) : (
            <div className="text-[11px] text-slate-400 italic px-3 py-1">
              No direct messages
            </div>
          )}
        </div>
      )}
    </div>
  );
}
