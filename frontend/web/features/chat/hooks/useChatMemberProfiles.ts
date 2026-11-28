import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { getPublicProfile } from "../api/chat.api";
import { chatKeys, CHAT_DEFAULT_STALE_TIME_MS } from "../types/chat.constant";
import { useActiveChat } from "./useChatQueries";
import { ChatProfilesMap } from "../types/chat.types";

export function useChatMemberProfiles(extraUserIds: string[] = [], options: { resolveMissing?: boolean } = {}) {
  const { activeChat } = useActiveChat();

  const memberProfiles = useMemo(() => {
    const profiles: ChatProfilesMap = {};
    activeChat?.members?.forEach((member) => {
      if (member.userId && member.profile) {
        profiles[member.userId] = { ...member.profile, mentionNames: member.nickname ? [member.nickname] : [] };
      }
    });
    return profiles;
  }, [activeChat?.members]);
  const missingIds = [...new Set(extraUserIds)].filter(id =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && !memberProfiles[id],
  );
  return useQueries({ queries: missingIds.map(id => ({
    queryKey: chatKeys.userProfile(id),
    queryFn: async () => (await getPublicProfile(id)).data,
    staleTime: CHAT_DEFAULT_STALE_TIME_MS,
    retry: false,
    enabled: Boolean(activeChat) && Boolean(options.resolveMissing),
  })), combine: queries => {
    const profiles = { ...memberProfiles };
    queries.forEach((query, index) => {
      if (query.data) profiles[missingIds[index]] = { ...query.data, userId: missingIds[index] };
    });
    return profiles;
  } });
}

export function useChatMemberProfilesQuery(extraUserIds: string[] = []) {
  const profiles = useChatMemberProfiles(extraUserIds);
  return { data: { profiles } };
}
