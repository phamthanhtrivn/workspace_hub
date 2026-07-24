import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { getUserConversations, getPublicProfile } from "../api/chat.api";
import { UserProfileResponse } from "../types/chat.types";

export function useChatMemberProfiles() {
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const { data } = useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return { conversations: [], profiles: {} };

      const response = await getUserConversations();
      const conversationsData = response?.success ? response.data : [];

      const uniqueUserIds = new Set<string>();
      conversationsData.forEach((conv: any) => {
        conv.members?.forEach((m: any) => {
          if (m.userId) {
            uniqueUserIds.add(m.userId);
          }
        });
      });

      const profiles: Record<string, UserProfileResponse> = {};
      await Promise.all(
        Array.from(uniqueUserIds).map(async (userId) => {
          try {
            const profileRes = await getPublicProfile(userId);
            profiles[userId] = profileRes?.success
              ? profileRes.data
              : ({ fullName: "Unknown User" } as any);
          } catch (e) {
            profiles[userId] = { fullName: "Unknown User" } as any;
          }
        }),
      );
      return { conversations: conversationsData, profiles };
    },
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5,
  });
  return (data as any)?.profiles || {};
}
