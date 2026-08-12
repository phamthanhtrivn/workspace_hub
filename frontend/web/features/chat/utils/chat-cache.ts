import { QueryClient } from "@tanstack/react-query";
import { chatKeys } from "../types/chat.constant";
import {
  ChatEntity,
  ChatMessageResponse,
  ChatUiType,
  ConversationMember,
  DirectMessage,
  SpaceChannel,
} from "../types/chat.types";
import { ChatContextPayload } from "../types/chat-socket.types";
import {
  DirectMessagesQueryData,
  SpaceChannelsQueryData,
} from "../hooks/useChatQueries";
import { sortDirectConversations } from "./direct-conversation-utils";

export function getMessageChatId(
  payload: Partial<ChatContextPayload> | null | undefined,
): string | null {
  return payload?.chatId ?? payload?.channelId ?? payload?.conversationId ?? null;
}

export function updateChannelsCache(
  queryClient: QueryClient,
  channelId: string,
  updater: (channel: SpaceChannel) => SpaceChannel,
  spaceId?: string | null,
) {
  const queryKey = spaceId ? chatKeys.channels(spaceId) : chatKeys.allChannels();
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
      const exists = channels.some((item: SpaceChannel) => item.id === channel.id);
      return {
        profiles: oldData?.profiles || {},
        channels: exists
          ? channels.map((item: SpaceChannel) => (item.id === channel.id ? channel : item))
          : [...channels, channel],
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
      const directMessages = oldData.directMessages.map((directMessage: DirectMessage) =>
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
      const exists = directMessages.some((item: DirectMessage) => item.id === directMessage.id);
      const nextDirectMessages = exists
        ? directMessages.map((item: DirectMessage) =>
            item.id === directMessage.id ? directMessage : item,
          )
        : [directMessage, ...directMessages];
      return {
        profiles: oldData?.profiles || {},
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
  void queryClient.invalidateQueries({ queryKey: chatKeys.allMemberProfiles() });
}
