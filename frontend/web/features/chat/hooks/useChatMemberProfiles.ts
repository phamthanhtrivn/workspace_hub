import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { getUserConversations, getPublicProfile } from "../api/chat.api";
import {
  ConversationResponse,
  UserProfileResponse,
} from "../types/chat.types";

export function useChatMemberProfiles(extraUserIds: string[] = []) {
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const activeConversation = useAppSelector(
    (state) => state.chat.activeConversation,
  );
  const activeMemberIds =
    activeConversation?.members?.map((member) => member.userId).join(",") ?? "";
  const extraUserIdsKey = [...new Set(extraUserIds.filter(Boolean))]
    .sort()
    .join(",");

  const { data } = useQuery({
    queryKey: [
      "chat-member-profiles",
      currentUserId,
      activeConversation?.id,
      activeMemberIds,
      extraUserIdsKey,
    ],
    queryFn: async () => {
      if (!currentUserId) return { conversations: [], profiles: {} };

      const response = await getUserConversations();
      const conversationsData: ConversationResponse[] = response?.success
        ? response.data
        : [];

      const uniqueUserIds = new Set<string>();
      conversationsData.forEach((conv) => {
        conv.members?.forEach((m) => {
          if (m.userId) {
            uniqueUserIds.add(m.userId);
          }
        });
      });
      activeConversation?.members?.forEach((member) => {
        if (member.userId) {
          uniqueUserIds.add(member.userId);
        }
      });
      extraUserIds.forEach((userId) => {
        if (userId) {
          uniqueUserIds.add(userId);
        }
      });

      const profiles: Record<string, UserProfileResponse> = {};
      await Promise.all(
        Array.from(uniqueUserIds).map(async (userId) => {
          try {
            const profileRes = await getPublicProfile(userId);
            profiles[userId] = profileRes?.success
              ? profileRes.data
              : ({ fullName: "Unknown User" } as UserProfileResponse);
          } catch {
            profiles[userId] = {
              fullName: "Unknown User",
            } as UserProfileResponse;
          }
        }),
      );
      return { conversations: conversationsData, profiles };
    },
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5,
  });
  return data?.profiles || {};
}
