import { QueryClient } from "@tanstack/react-query";
import { chatKeys } from "../types/chat.constant";
import {
  ChatEntity,
  ChatMessageResponse,
  ChatUiType,
  ConversationMember,
  DirectMessage,
  SpaceChannel,
  SpaceMembersListResponse,
  SpaceMemberRole,
  SpaceRole,
  SpaceResponse,
  SpaceSettingResponse,
} from "../types/chat.types";
import { ChatContextPayload } from "../types/chat-socket.types";
import {
  DirectMessagesQueryData,
  SpaceChannelsQueryData,
} from "../hooks/useChatQueries";
import { sortDirectConversations } from "./direct-conversation-utils";
import { normalizeSpaceSetting } from "./space-setting-utils";

type SpaceMemberRolePatch = {
  userId: string;
  role: SpaceMemberRole;
};

export function getMessageChatId(
  payload: Partial<ChatContextPayload> | null | undefined,
): string | null {
  return (
    payload?.chatId ?? payload?.channelId ?? payload?.conversationId ?? null
  );
}

export function updateChannelsCache(
  queryClient: QueryClient,
  channelId: string,
  updater: (channel: SpaceChannel) => SpaceChannel,
  spaceId?: string | null,
) {
  const queryKey = spaceId
    ? chatKeys.channels(spaceId)
    : chatKeys.allChannels();
  queryClient.setQueriesData<SpaceChannelsQueryData>(
    { queryKey },
    (oldData: SpaceChannelsQueryData | undefined) => {
      if (!oldData?.channels) return oldData;
      return {
        ...oldData,
        channels: oldData.channels.map((channel: SpaceChannel) =>
          channel.id === channelId ? updater(channel) : channel,
        ),
      };
    },
  );
}

export function upsertChannelCache(
  queryClient: QueryClient,
  channel: SpaceChannel,
) {
  if (!channel.spaceId) return;
  queryClient.setQueryData<SpaceChannelsQueryData>(
    chatKeys.channels(channel.spaceId),
    (oldData: SpaceChannelsQueryData | undefined) => {
      const channels = oldData?.channels || [];
      const exists = channels.some(
        (item: SpaceChannel) => item.id === channel.id,
      );
      return {
        channels: exists
          ? channels.map((item: SpaceChannel) =>
              item.id === channel.id ? channel : item,
            )
          : [...channels, channel],
      };
    },
  );
}

export function removeChannelFromCaches(
  queryClient: QueryClient,
  channelId: string,
) {
  queryClient.setQueriesData<SpaceChannelsQueryData>(
    { queryKey: chatKeys.allChannels() },
    (oldData: SpaceChannelsQueryData | undefined) => {
      if (!oldData?.channels) return oldData;
      return {
        ...oldData,
        channels: oldData.channels.filter(
          (channel: SpaceChannel) => channel.id !== channelId,
        ),
      };
    },
  );
}

export function removeSpaceFromCaches(
  queryClient: QueryClient,
  spaceId: string,
) {
  queryClient.setQueriesData<SpaceResponse[]>(
    { queryKey: chatKeys.allSpaces() },
    (oldSpaces: SpaceResponse[] | undefined) =>
      oldSpaces?.filter((space) => space.id !== spaceId) ?? oldSpaces,
  );
  queryClient.setQueriesData<SpaceChannelsQueryData>(
    { queryKey: chatKeys.allChannels() },
    (oldData: SpaceChannelsQueryData | undefined) => {
      if (!oldData?.channels) return oldData;
      return {
        ...oldData,
        channels: oldData.channels.filter(
          (channel: SpaceChannel) => channel.spaceId !== spaceId,
        ),
      };
    },
  );
  queryClient.removeQueries({ queryKey: chatKeys.channels(spaceId) });
  queryClient.removeQueries({ queryKey: chatKeys.spaceDetails(spaceId) });
  queryClient.removeQueries({ queryKey: chatKeys.spaceMembers(spaceId) });
  queryClient.removeQueries({ queryKey: chatKeys.spaceInvitations(spaceId) });
}

export async function cleanupRemovedSpaceCaches(
  queryClient: QueryClient,
  spaceId: string,
) {
  const cancellations = [
    queryClient.cancelQueries({ queryKey: chatKeys.channels(spaceId) }),
    queryClient.cancelQueries({ queryKey: chatKeys.spaceDetails(spaceId) }),
    queryClient.cancelQueries({ queryKey: chatKeys.spaceMembers(spaceId) }),
    queryClient.cancelQueries({ queryKey: chatKeys.spaceInvitations(spaceId) }),
  ];

  removeSpaceFromCaches(queryClient, spaceId);
  await Promise.all(cancellations);
  removeSpaceFromCaches(queryClient, spaceId);
}

export function patchSpaceSettingInCaches(
  queryClient: QueryClient,
  spaceId: string,
  setting: SpaceSettingResponse,
) {
  const normalizedSetting = normalizeSpaceSetting(setting, spaceId);

  queryClient.setQueriesData<SpaceResponse[]>(
    { queryKey: chatKeys.allSpaces() },
    (oldSpaces: SpaceResponse[] | undefined) =>
      oldSpaces?.map((space) =>
        space.id === spaceId ? { ...space, setting: normalizedSetting } : space,
      ) ?? oldSpaces,
  );
  queryClient.setQueryData<SpaceResponse>(
    chatKeys.spaceDetails(spaceId),
    (oldSpace: SpaceResponse | undefined) =>
      oldSpace ? { ...oldSpace, setting: normalizedSetting } : oldSpace,
  );
}

export function patchSpaceOwnerInCaches(
  queryClient: QueryClient,
  spaceId: string,
  ownerId: string,
) {
  queryClient.setQueriesData<SpaceResponse[]>(
    { queryKey: chatKeys.allSpaces() },
    (oldSpaces: SpaceResponse[] | undefined) =>
      oldSpaces?.map((space) =>
        space.id === spaceId
          ? { ...space, createdBy: ownerId, ownerId }
          : space,
      ) ?? oldSpaces,
  );

  queryClient.setQueriesData<SpaceResponse>(
    { queryKey: chatKeys.spaceDetails(spaceId) },
    (oldSpace: SpaceResponse | undefined) =>
      oldSpace ? { ...oldSpace, createdBy: ownerId, ownerId } : oldSpace,
  );
}

export function patchSpaceMemberRoleInCaches(
  queryClient: QueryClient,
  spaceId: string,
  memberId: string,
  role: SpaceMemberRole,
) {
  const spaceMembersQueryKey = chatKeys.spaceMembers(spaceId).slice(0, 2);

  queryClient.setQueriesData<SpaceMembersListResponse>(
    { queryKey: spaceMembersQueryKey },
    (oldData: SpaceMembersListResponse | undefined) => {
      if (!oldData) return oldData;
      const allMembers = [
        ...(oldData.admins || []),
        ...(oldData.members || []),
      ];
      const nextMembers = allMembers.map((member) =>
        member.userId === memberId ? { ...member, role } : member,
      );
      return {
        ...oldData,
        admins: nextMembers.filter((member) => member.role === SpaceRole.ADMIN),
        members: nextMembers.filter(
          (member) => member.role !== SpaceRole.ADMIN,
        ),
      };
    },
  );
}

export function patchChannelMemberRolesInCaches(
  queryClient: QueryClient,
  spaceId: string,
  rolePatches: SpaceMemberRolePatch[],
) {
  if (rolePatches.length === 0) return;

  const roleByUserId = new Map(
    rolePatches.map((member) => [member.userId, member.role]),
  );

  queryClient.setQueriesData<SpaceChannelsQueryData>(
    { queryKey: chatKeys.allChannels() },
    (oldData: SpaceChannelsQueryData | undefined) => {
      if (!oldData?.channels) return oldData;
      return {
        ...oldData,
        channels: oldData.channels.map((channel: SpaceChannel) => {
          if (channel.spaceId !== spaceId || !channel.members) return channel;
          return {
            ...channel,
            members: channel.members.map((member: ConversationMember) => {
              const nextRole = roleByUserId.get(member.userId);
              return nextRole ? { ...member, role: nextRole } : member;
            }),
          };
        }),
      };
    },
  );
}

export function removeSpaceMemberFromCaches(
  queryClient: QueryClient,
  spaceId: string,
  memberId: string,
) {
  const spaceMembersQueryKey = chatKeys.spaceMembers(spaceId).slice(0, 2);

  queryClient.setQueriesData<SpaceMembersListResponse>(
    { queryKey: spaceMembersQueryKey },
    (oldData: SpaceMembersListResponse | undefined) =>
      oldData
        ? {
            ...oldData,
            admins: oldData.admins?.filter(
              (member) => member.userId !== memberId,
            ),
            members: oldData.members?.filter(
              (member) => member.userId !== memberId,
            ),
          }
        : oldData,
  );

  queryClient.setQueriesData<SpaceChannelsQueryData>(
    { queryKey: chatKeys.allChannels() },
    (oldData: SpaceChannelsQueryData | undefined) => {
      if (!oldData?.channels) return oldData;
      return {
        ...oldData,
        channels: oldData.channels.map((channel: SpaceChannel) =>
          channel.spaceId === spaceId
            ? {
                ...channel,
                members: channel.members?.filter(
                  (member) => member.userId !== memberId,
                ),
              }
            : channel,
        ),
      };
    },
  );
}

export function updateDirectMessagesCache(
  queryClient: QueryClient,
  currentUserId: string | null | undefined,
  updater: (directMessage: DirectMessage) => DirectMessage,
  directMessageId?: string,
) {
  queryClient.setQueriesData<DirectMessagesQueryData>(
    {
      queryKey: currentUserId
        ? chatKeys.directMessages(currentUserId)
        : chatKeys.allDirectMessages(),
    },
    (oldData: DirectMessagesQueryData | undefined) => {
      if (!oldData?.directMessages) return oldData;
      const directMessages = oldData.directMessages.map(
        (directMessage: DirectMessage) =>
          !directMessageId || directMessage.id === directMessageId
            ? updater(directMessage)
            : directMessage,
      );
      return {
        ...oldData,
        directMessages: sortDirectConversations(directMessages, currentUserId),
      };
    },
  );
}

export function upsertDirectMessageCache(
  queryClient: QueryClient,
  currentUserId: string | null | undefined,
  directMessage: DirectMessage,
) {
  queryClient.setQueryData<DirectMessagesQueryData>(
    chatKeys.directMessages(currentUserId),
    (oldData: DirectMessagesQueryData | undefined) => {
      const directMessages = oldData?.directMessages || [];
      const exists = directMessages.some(
        (item: DirectMessage) => item.id === directMessage.id,
      );
      const nextDirectMessages = exists
        ? directMessages.map((item: DirectMessage) =>
            item.id === directMessage.id ? directMessage : item,
          )
        : [directMessage, ...directMessages];
      return {
        directMessages: sortDirectConversations(
          nextDirectMessages,
          currentUserId,
        ),
      };
    },
  );
}

export function patchChatMember<TChat extends ChatEntity>(
  chat: TChat,
  userId: string,
  changes: Partial<ConversationMember>,
) {
  return {
    ...chat,
    members: chat.members?.map((member: ConversationMember) =>
      member.userId === userId ? { ...member, ...changes } : member,
    ),
  } as TChat;
}

export function clearChatUnread<TChat extends ChatEntity>(chat: TChat): TChat {
  return {
    ...chat,
    unreadCount: 0,
    hasMention: false,
    hasUnreadThread: false,
  };
}

export function updateMessagePagesCache(
  queryClient: QueryClient,
  chatType: ChatUiType | null | undefined,
  chatId: string,
  updater: (message: ChatMessageResponse) => ChatMessageResponse,
  messageId?: string,
) {
  queryClient.setQueriesData<{ pages?: { messages: ChatMessageResponse[] }[] }>(
    { queryKey: chatKeys.messages(chatType, chatId) },
    (oldData) => {
      if (!oldData?.pages) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          messages: page.messages.map((message) =>
            !messageId || message.id === messageId ? updater(message) : message,
          ),
        })),
      };
    },
  );
}

export function invalidateChatSidebarQueries(
  queryClient: QueryClient,
  currentUserId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: chatKeys.allSpaces() });
  void queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
  void queryClient.invalidateQueries({
    queryKey: currentUserId
      ? chatKeys.directMessages(currentUserId)
      : chatKeys.allDirectMessages(),
  });
}
