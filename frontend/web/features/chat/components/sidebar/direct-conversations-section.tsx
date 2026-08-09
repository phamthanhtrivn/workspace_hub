"use client";

import { useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@/store/store";
import {
  mergeMemberProfiles,
  setDirectConversations,
  setDirectConversationsLoading,
  updateMuteStatus,
  updatePinStatus,
} from "@/store/chat/chat-slice";
import {
  getBulkProfilesByIds,
  getDirectConversations,
  muteDirectConversation,
  pinDirectConversation,
} from "../../api/chat.api";
import {
  ChatProfilesMap,
  ConversationResponse,
} from "../../types/chat.types";
import {
  ChatQueryKey,
  ChatSidebarSection,
} from "../../types/chat.constant";
import DirectConversationItem from "./direct-conversation-item";
import { sortDirectConversations } from "../../utils/direct-conversation-utils";

interface DirectConversationsQueryData {
  conversations: ConversationResponse[];
  profiles: ChatProfilesMap;
}

const EMPTY_DIRECT_CONVERSATIONS: ConversationResponse[] = [];
const EMPTY_MEMBER_PROFILES: ChatProfilesMap = {};

interface DirectConversationsSectionProps {
  activeConversationId?: string;
  currentUserId: string | null;
  searchQuery: string;
  onCreateDirectConversation: () => void;
  onSelectConversation: (
    conversation: ConversationResponse,
    profiles?: ChatProfilesMap,
  ) => void;
}

export default function DirectConversationsSection({
  activeConversationId,
  currentUserId,
  searchQuery,
  onCreateDirectConversation,
  onSelectConversation,
}: DirectConversationsSectionProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const {
    data,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
    queryFn: async (): Promise<DirectConversationsQueryData> => {
      if (!currentUserId) return { conversations: [], profiles: {} };

      const response = await getDirectConversations();
      const conversations = response.success ? response.data : [];

      const userIds = new Set<string>();
      conversations.forEach((conversation) => {
        conversation.members?.forEach((member) => {
          if (member.userId) userIds.add(member.userId);
        });
      });

      const profiles: ChatProfilesMap = {};
      const profileIds = Array.from(userIds);
      if (profileIds.length > 0) {
        const profilesResponse = await getBulkProfilesByIds(profileIds);
        if (profilesResponse.success) {
          profilesResponse.data.forEach((profile) => {
            if (profile.id) {
              profiles[profile.id] = profile;
            }
          });
        }
      }

      return { conversations, profiles };
    },
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5,
  });

  const directConversations = useMemo(
    () =>
      sortDirectConversations(
        data?.conversations ?? EMPTY_DIRECT_CONVERSATIONS,
        currentUserId,
      ),
    [currentUserId, data?.conversations],
  );
  const memberProfiles = data?.profiles ?? EMPTY_MEMBER_PROFILES;
  const isLoadingProfiles = isLoading || isFetching;

  useEffect(() => {
    dispatch(setDirectConversationsLoading(isLoadingProfiles));
  }, [dispatch, isLoadingProfiles]);

  useEffect(() => {
    if (!data) return;
    dispatch(setDirectConversations(sortDirectConversations(data.conversations, currentUserId)));
    dispatch(mergeMemberProfiles(data.profiles));
  }, [currentUserId, data, dispatch]);

  const filteredDirectConversations = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (!trimmedQuery) return directConversations;

    return directConversations.filter((conversation) => {
      const otherMember = conversation.members?.find(
        (member) => member.userId !== currentUserId,
      );
      const profile = otherMember ? memberProfiles[otherMember.userId] : null;
      const name = profile?.fullName || "User";
      return name.toLowerCase().includes(trimmedQuery);
    });
  }, [currentUserId, directConversations, memberProfiles, searchQuery]);

  const updateDirectConversationMemberCache = (
    conversationId: string,
    memberPatch: { pinned?: boolean; muted?: boolean },
  ) => {
    const queryKey = [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId];
    queryClient.setQueryData<DirectConversationsQueryData>(
      queryKey,
      (oldData) => {
        if (!oldData) return oldData;

        const conversations = sortDirectConversations(oldData.conversations
          .map((conversation) => {
            if (conversation.id !== conversationId) return conversation;
            return {
              ...conversation,
              members: conversation.members.map((member) =>
                member.userId === currentUserId
                  ? { ...member, ...memberPatch }
                  : member,
              ),
            };
          }), currentUserId);

        return { ...oldData, conversations };
      },
    );
  };

  const pinMutation = useMutation({
    mutationFn: ({
      conversationId,
      pinned,
    }: {
      conversationId: string;
      pinned: boolean;
    }) => pinDirectConversation(conversationId, pinned),
    onMutate: async ({ conversationId, pinned }) => {
      await queryClient.cancelQueries({
        queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
      });
      const queryKey = [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId];
      const previousData =
        queryClient.getQueryData<DirectConversationsQueryData>(queryKey);

      updateDirectConversationMemberCache(conversationId, { pinned });
      if (currentUserId) {
        dispatch(updatePinStatus({ conversationId, userId: currentUserId, pinned }));
      }

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
          context.previousData,
        );
        const previousConversation = context.previousData.conversations.find(
          (conversation) => conversation.id === _variables.conversationId,
        );
        const previousMember = previousConversation?.members.find(
          (member) => member.userId === currentUserId,
        );
        if (currentUserId && previousMember) {
          dispatch(
            updatePinStatus({
              conversationId: _variables.conversationId,
              userId: currentUserId,
              pinned: previousMember.pinned || false,
            }),
          );
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
      });
    },
  });

  const muteMutation = useMutation({
    mutationFn: ({
      conversationId,
      muted,
    }: {
      conversationId: string;
      muted: boolean;
    }) => muteDirectConversation(conversationId, muted),
    onMutate: async ({ conversationId, muted }) => {
      await queryClient.cancelQueries({
        queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
      });
      const queryKey = [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId];
      const previousData =
        queryClient.getQueryData<DirectConversationsQueryData>(queryKey);

      updateDirectConversationMemberCache(conversationId, { muted });
      if (currentUserId) {
        dispatch(updateMuteStatus({ conversationId, userId: currentUserId, muted }));
      }

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
          context.previousData,
        );
        const previousConversation = context.previousData.conversations.find(
          (conversation) => conversation.id === _variables.conversationId,
        );
        const previousMember = previousConversation?.members.find(
          (member) => member.userId === currentUserId,
        );
        if (currentUserId && previousMember) {
          dispatch(
            updateMuteStatus({
              conversationId: _variables.conversationId,
              userId: currentUserId,
              muted: previousMember.muted || false,
            }),
          );
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
      });
    },
  });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-3 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <span>{ChatSidebarSection.DIRECT_MESSAGES}</span>
        <button
          onClick={onCreateDirectConversation}
          className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
          title="Find new chat"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-0.5">
        {isLoading ? (
          <div className="text-[11px] text-slate-400 italic px-3 py-1">
            Loading...
          </div>
        ) : filteredDirectConversations.length > 0 ? (
          filteredDirectConversations.map((conversation) => (
            <DirectConversationItem
              key={conversation.id}
              conversation={conversation}
              currentUserId={currentUserId}
              memberProfiles={memberProfiles}
              isLoadingProfile={isLoadingProfiles}
              isActive={activeConversationId === conversation.id}
              onClick={(selectedConversation) =>
                onSelectConversation(selectedConversation, memberProfiles)
              }
              onTogglePin={(selectedConversation, pinned) =>
                pinMutation.mutate({
                  conversationId: selectedConversation.id,
                  pinned,
                })
              }
              onToggleMute={(selectedConversation, muted) =>
                muteMutation.mutate({
                  conversationId: selectedConversation.id,
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
    </div>
  );
}
