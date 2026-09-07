import {
  ChannelMemberListItem,
  ChannelMembersListResponse,
  ConversationMember,
  UserProfileSnapshotResponse,
} from "../types/chat.types";

export interface MentionMemberOption {
  id: string;
  name: string;
  avatarUrl?: string | null;
  isAll?: boolean;
}

export function shouldShowAllMentionOption(searchQuery: string) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return (
    normalizedQuery === "" ||
    "all".includes(normalizedQuery) ||
    "everyone".includes(normalizedQuery)
  );
}

export function getChannelMentionOptions(
  membersResponse: ChannelMembersListResponse | undefined,
  currentUserId?: string | null,
  options: { includeAll?: boolean; searchQuery?: string; limit?: number } = {},
): MentionMemberOption[] {
  const limit = options.limit ?? 4;
  const members = [
    ...(membersResponse?.admins ?? []),
    ...(membersResponse?.members ?? []),
  ]
    .filter((member) => member.userId !== currentUserId)
    .map(toChannelMentionOption);

  const limitedMembers = options.includeAll ? members.slice(0, limit - 1) : members.slice(0, limit);

  if (
    options.includeAll &&
    shouldShowAllMentionOption(options.searchQuery ?? "")
  ) {
    return [
      {
        id: "all",
        name: "All",
        avatarUrl: undefined,
        isAll: true,
      },
      ...limitedMembers,
    ];
  }

  return limitedMembers;
}

export function getCachedMentionOptions(
  members: ConversationMember[] | undefined,
  profiles: Record<string, UserProfileSnapshotResponse | null | undefined>,
  searchQuery: string,
  currentUserId?: string | null,
  limit = 4,
): MentionMemberOption[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (members ?? [])
    .filter((member) => member.userId !== currentUserId)
    .map((member) => {
      const profile = profiles[member.userId];
      return {
        id: member.userId,
        name: getDisplayName(member.nickname, profile, member.userId),
        avatarUrl: profile?.avatarUrl,
      };
    })
    .filter((member) => member.name.toLowerCase().includes(normalizedQuery))
    .slice(0, limit);
}

function toChannelMentionOption(
  member: ChannelMemberListItem,
): MentionMemberOption {
  return {
    id: member.userId,
    name: getDisplayName(member.nickname, member.profile, member.userId),
    avatarUrl: member.profile?.avatarUrl,
  };
}

function getDisplayName(
  nickname: string | null | undefined,
  profile: UserProfileSnapshotResponse | null | undefined,
  fallback: string,
) {
  return nickname || profile?.fullName || profile?.email || fallback;
}
