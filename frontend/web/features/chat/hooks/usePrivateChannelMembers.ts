import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import {
  addChannelMembers,
  getPrivateChannelMemberDirectory,
  kickMember,
} from "../api/channel.api";
import type { ChannelResponse } from "../types/chat.types";
import {
  chatKeys,
  CHANNEL_MEMBER_SEARCH_DEBOUNCE_MS,
} from "../types/chat.constant";
import { getErrorMessage } from "../types/space-settings/space-settings.types";
import { isPrivateChannelOwner } from "../utils/channel-membership-permissions";
import { useDebouncedValue } from "./useDebouncedValue";

export function usePrivateChannelMembers(channel: ChannelResponse) {
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(
    search.trim(),
    CHANNEL_MEMBER_SEARCH_DEBOUNCE_MS,
  );
  const isSearching = search.trim() !== debouncedSearch;
  const query = useQuery({
    queryKey: chatKeys.privateChannelMemberDirectory(
      channel.id,
      currentUserId,
      channel.ownerId,
      debouncedSearch,
      page,
    ),
    queryFn: async ({ signal }) =>
      (
        await getPrivateChannelMemberDirectory(
          channel.id,
          { page, search: debouncedSearch },
          signal,
        )
      ).data,
    enabled: Boolean(currentUserId) && !isSearching,
    placeholderData: keepPreviousData,
  });
  const canManage =
    isPrivateChannelOwner(channel, currentUserId) &&
    query.data?.canManage === true;
  const membership = useMutation({
    mutationFn: async ({
      userId,
      joined,
    }: {
      userId: string;
      joined: boolean;
    }) => {
      if (joined) await kickMember(channel.id, userId);
      else await addChannelMembers(channel.id, [userId]);
    },
    onSuccess: async (_response, { joined }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() }),
        queryClient.invalidateQueries({
          queryKey: chatKeys.spaceMemberCandidatesForSpace(channel.spaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: [chatKeys.channelMembers(channel.id)[0], channel.id],
        }),
      ]);
      toast.success(
        joined ? "Member removed from channel" : "Member added and notified",
      );
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          "Could not update channel members. Please try again.",
        ),
      ),
  });
  return {
    ...query,
    canManage,
    members: (query.data?.members ?? []).filter(
      (member) => canManage || member.joined,
    ),
    pagination: query.data?.pagination,
    isLoading: query.isPending || isSearching || query.isPlaceholderData,
    isSearching,
    search,
    setSearch,
    setPage,
    membership,
  };
}
