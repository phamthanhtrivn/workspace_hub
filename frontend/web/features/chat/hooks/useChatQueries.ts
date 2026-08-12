import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import {
  getBulkProfilesByIds,
  getDirectConversations,
  getSpaceChannels,
  getUserSpaces,
} from "../api/chat.api";
import {
  CHAT_DEFAULT_STALE_TIME_MS,
  chatKeys,
} from "../types/chat.constant";
import {
  ChatEntity,
  ChatContextType,
  ChatMessageResponse,
  ChatProfilesMap,
  DirectMessage,
  SpaceChannel,
} from "../types/chat.types";

export interface DirectMessagesQueryData {
  directMessages: DirectMessage[];
  profiles: ChatProfilesMap;
}

export interface SpaceChannelsQueryData {
  channels: SpaceChannel[];
  profiles: ChatProfilesMap;
}

export function getProfileIdsFromChats(chats: ChatEntity[]) {
  const userIds = new Set<string>();
  chats.forEach((chat) => {
    chat.members?.forEach((member) => {
      if (member.userId) userIds.add(member.userId);
    });
  });
  return Array.from(userIds);
}

async function fetchProfilesByIds(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const profilesResponse = await getBulkProfilesByIds(uniqueIds);
  if (!profilesResponse.success) return {};

  return profilesResponse.data.reduce<ChatProfilesMap>((profiles, profile) => {
    if (profile.id) {
      profiles[profile.id] = profile;
    }
    return profiles;
  }, {});
}

export function useSpacesQuery(currentUserId?: string | null) {
  return useQuery({
    queryKey: chatKeys.spaces(currentUserId),
    queryFn: async () => {
      if (!currentUserId) return [];
      const res = await getUserSpaces();
      return res?.success ? res.data : [];
    },
    enabled: !!currentUserId,
    staleTime: CHAT_DEFAULT_STALE_TIME_MS,
  });
}

export function useSpaceChannelsQuery(spaceId?: string | null) {
  return useQuery({
    queryKey: chatKeys.channels(spaceId),
    queryFn: async (): Promise<SpaceChannelsQueryData> => {
      if (!spaceId) return { channels: [], profiles: {} };
      const res = await getSpaceChannels(spaceId);
      const channels = res?.success ? res.data : [];
      const profiles = await fetchProfilesByIds(getProfileIdsFromChats(channels));
      return { channels, profiles };
    },
    enabled: !!spaceId,
    staleTime: CHAT_DEFAULT_STALE_TIME_MS,
  });
}

export function useDirectMessagesQuery(currentUserId?: string | null) {
  return useQuery({
    queryKey: chatKeys.directMessages(currentUserId),
    queryFn: async (): Promise<DirectMessagesQueryData> => {
      if (!currentUserId) return { directMessages: [], profiles: {} };
      const response = await getDirectConversations();
      const directMessages = response.success ? response.data : [];
      const profiles = await fetchProfilesByIds(
        getProfileIdsFromChats(directMessages),
      );
      return { directMessages, profiles };
    },
    enabled: !!currentUserId,
    staleTime: CHAT_DEFAULT_STALE_TIME_MS,
  });
}

export function useChatProfiles(userIds: string[] = []) {
  const userIdsKey = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).sort().join(","),
    [userIds],
  );

  const { data } = useQuery({
    queryKey: chatKeys.memberProfiles(userIdsKey),
    queryFn: () => fetchProfilesByIds(userIdsKey ? userIdsKey.split(",") : []),
    enabled: userIdsKey.length > 0,
    staleTime: CHAT_DEFAULT_STALE_TIME_MS,
  });

  return data || {};
}

export function useActiveChat() {
  const queryClient = useQueryClient();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const { activeChatId, activeChatType, activeSpaceId } = useAppSelector(
    (state) => state.chat,
  );

  const { data: channelsData } = useSpaceChannelsQuery(activeSpaceId);
  const { data: directMessagesData } = useDirectMessagesQuery(currentUserId);

  const activeChat = useMemo(() => {
    if (!activeChatId || !activeChatType) return null;

    if (activeChatType === ChatContextType.DIRECT_MESSAGE) {
      const directMessages =
        directMessagesData?.directMessages ||
        queryClient.getQueryData<DirectMessagesQueryData>(
          chatKeys.directMessages(currentUserId),
        )?.directMessages ||
        [];
      return directMessages.find((chat) => chat.id === activeChatId) || null;
    }

    const activeSpaceChannels =
      channelsData?.channels ||
      queryClient.getQueryData<SpaceChannelsQueryData>(
        chatKeys.channels(activeSpaceId),
      )?.channels ||
      [];
    const activeSpaceChannel = activeSpaceChannels.find(
      (chat) => chat.id === activeChatId,
    );
    if (activeSpaceChannel) return activeSpaceChannel;

    const channelQueries = queryClient.getQueriesData<SpaceChannelsQueryData>({
      queryKey: chatKeys.allChannels(),
    });
    for (const [, data] of channelQueries) {
      const channel = data?.channels?.find((chat) => chat.id === activeChatId);
      if (channel) return channel;
    }

    return null;
  }, [
    activeChatId,
    activeChatType,
    activeSpaceId,
    channelsData?.channels,
    currentUserId,
    directMessagesData?.directMessages,
    queryClient,
  ]);

  return {
    activeChat,
    activeChatId,
    activeChatType,
    activeSpaceId,
    isDirectMessage: activeChatType === ChatContextType.DIRECT_MESSAGE,
    isChannel: activeChatType === ChatContextType.CHANNEL,
  };
}

export function useActiveThreadRootMessage() {
  const queryClient = useQueryClient();
  const {
    activeThreadRootMessage,
    activeThreadRootMessageId,
    activeThreadChatId,
    activeThreadChatType,
  } = useAppSelector((state) => state.chat);

  return useMemo(() => {
    if (!activeThreadRootMessageId || !activeThreadChatId) return null;
    if (activeThreadRootMessage?.id === activeThreadRootMessageId) {
      return activeThreadRootMessage;
    }

    const messageQueries = queryClient.getQueriesData<{
      pages?: { messages?: ChatMessageResponse[] }[];
    }>({
      queryKey: chatKeys.messages(activeThreadChatType, activeThreadChatId),
    });
    for (const [, data] of messageQueries) {
      for (const page of data?.pages || []) {
        const message = page?.messages?.find(
          (item) => item.id === activeThreadRootMessageId,
        );
        if (message) return message;
      }
    }

    const threadQueries = queryClient.getQueriesData<{
      rootMessage?: ChatMessageResponse;
    }>({
      queryKey: chatKeys.allThreadMessages(),
    });
    for (const [, data] of threadQueries) {
      if (data?.rootMessage?.id === activeThreadRootMessageId) {
        return data.rootMessage;
      }
    }

    return null;
  }, [
    activeThreadChatId,
    activeThreadChatType,
    activeThreadRootMessage,
    activeThreadRootMessageId,
    queryClient,
  ]);
}
