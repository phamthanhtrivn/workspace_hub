import { useMemo } from "react";
import { useActiveChat, useChatProfiles } from "./useChatQueries";

export function useChatMemberProfiles(extraUserIds: string[] = []) {
  const { activeChat } = useActiveChat();
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    activeChat?.members?.forEach((member) => {
      if (member.userId) ids.add(member.userId);
    });
    extraUserIds.forEach((userId) => {
      if (userId) ids.add(userId);
    });
    return Array.from(ids);
  }, [activeChat?.members, extraUserIds]);

  return useChatProfiles(userIds);
}

export function useChatMemberProfilesQuery(extraUserIds: string[] = []) {
  const profiles = useChatMemberProfiles(extraUserIds);
  return { data: { profiles } };
}
