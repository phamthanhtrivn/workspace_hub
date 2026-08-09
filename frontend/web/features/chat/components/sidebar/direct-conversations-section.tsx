"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getBulkProfilesByIds,
  getDirectConversations,
} from "../../api/chat.api";
import {
  ChatProfilesMap,
  ConversationResponse,
} from "../../types/chat.types";
import {
  ChatQueryKey,
  ChatSidebarSection,
} from "../../types/chat.constant";
import ConversationItem from "./conversation-item";

interface DirectConversationsQueryData {
  conversations: ConversationResponse[];
  profiles: ChatProfilesMap;
}

interface DirectConversationsSectionProps {
  activeConversationId?: string;
  currentUserId: string | null;
  searchQuery: string;
  onCreateDirectConversation: () => void;
  onSelectConversation: (conversation: ConversationResponse) => void;
}

export default function DirectConversationsSection({
  activeConversationId,
  currentUserId,
  searchQuery,
  onCreateDirectConversation,
  onSelectConversation,
}: DirectConversationsSectionProps) {
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

  const directConversations = data?.conversations || [];
  const memberProfiles = data?.profiles || {};
  const isLoadingProfiles = isLoading || isFetching;

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
            <ConversationItem
              key={conversation.id}
              conv={conversation}
              currentUserId={currentUserId}
              memberProfiles={memberProfiles}
              isLoadingProfile={isLoadingProfiles}
              isActive={activeConversationId === conversation.id}
              onClick={onSelectConversation}
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
