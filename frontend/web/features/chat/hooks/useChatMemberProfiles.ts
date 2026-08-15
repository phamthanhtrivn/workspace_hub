import { useMemo } from "react";
import { useActiveChat } from "./useChatQueries";
import { ChatProfilesMap } from "../types/chat.types";

export function useChatMemberProfiles(_extraUserIds: string[] = []) {
  const { activeChat } = useActiveChat();

  return useMemo(() => {
    const profiles: ChatProfilesMap = {};
    activeChat?.members?.forEach((member) => {
      if (member.userId && member.profile) {
        profiles[member.userId] = member.profile;
      }
    });
    return profiles;
  }, [activeChat?.members]);
}

export function useChatMemberProfilesQuery(extraUserIds: string[] = []) {
  const profiles = useChatMemberProfiles(extraUserIds);
  return { data: { profiles } };
}
