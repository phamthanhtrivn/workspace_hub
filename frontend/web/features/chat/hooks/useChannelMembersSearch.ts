import { useQuery } from "@tanstack/react-query";
import { getChannelMembers } from "../api/chat.api";
import {
  CHANNEL_MEMBER_SEARCH_DEBOUNCE_MS,
  CHANNEL_MEMBER_SEARCH_PAGE_SIZE,
  chatKeys,
} from "../types/chat.constant";
import { useDebouncedValue } from "./useDebouncedValue";

interface UseChannelMembersSearchOptions {
  channelId?: string | null;
  searchQuery: string;
  enabled?: boolean;
}

export function useChannelMembersSearch({
  channelId,
  searchQuery,
  enabled = true,
}: UseChannelMembersSearchOptions) {
  const debouncedSearchQuery = useDebouncedValue(
    searchQuery.trim(),
    CHANNEL_MEMBER_SEARCH_DEBOUNCE_MS,
  );

  const query = useQuery({
    queryKey: chatKeys.channelMembers(channelId, debouncedSearchQuery),
    queryFn: () =>
      getChannelMembers(
        channelId as string,
        debouncedSearchQuery || undefined,
        CHANNEL_MEMBER_SEARCH_PAGE_SIZE,
      ),
    enabled: enabled && !!channelId,
    staleTime: 1000 * 30,
    retry: 1,
  });

  return {
    ...query,
    debouncedSearchQuery,
    membersResponse: query.data?.data,
  };
}
