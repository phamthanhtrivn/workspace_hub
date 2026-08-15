import { useEffect, useRef } from "react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  setActiveConversation,
  setActiveSpaceId,
} from "@/store/chat/chat-slice";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
import { chatKeys } from "../types/chat.constant";
import {
  ChatContextType,
  SpaceRole,
  SpaceSettingResponse,
} from "../types/chat.types";
import {
  ChatSocketMemberPayload,
  ChatSocketMessagePayload,
  ChatSocketDisbandedPayload,
  ChatSocketMuteUpdatedPayload,
  ChatSocketReadPayload,
  ChatSocketRoleUpdatedPayload,
  ChatSocketSettingUpdatedPayload,
  ChatSocketUpdatedPayload,
  ThreadFollowerPayload,
} from "../types/chat-socket.types";
import {
  cleanupRemovedSpaceCaches,
  clearChatUnread,
  getMessageChatId,
  patchChatMember,
  patchSpaceMemberRoleInCaches,
  patchSpaceSettingInCaches,
  removeChannelFromCaches,
  updateChannelsCache,
  updateDirectMessagesCache,
} from "../utils/chat-cache";

function isChannelPayload(payload: {
  chatType?: ChatContextType;
  channelId?: string | null;
  conversationId?: string | null;
}) {
  return (
    payload.chatType === ChatContextType.CHANNEL ||
    (!!payload.channelId && !payload.conversationId)
  );
}

function isThreadFollowerCurrentUser(
  follower: ThreadFollowerPayload,
  currentUserId: string,
) {
  return typeof follower === "string"
    ? follower === currentUserId
    : follower.userId === currentUserId;
}

function hasCachedDirectConversation(
  queryClient: QueryClient,
  conversationId: string,
) {
  const directConversationQueries = queryClient.getQueriesData<{
    directMessages?: { id: string }[];
  }>({ queryKey: chatKeys.allDirectMessages() });

  return directConversationQueries.some(([, data]) =>
    data?.directMessages?.some((conversation) => conversation.id === conversationId),
  );
}

function isSpaceSetting(value: unknown): value is SpaceSettingResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "allowMemberCreateChannel" in value
  );
}

export function useChatSocket() {
  const { userId: currentUserId, accessToken } = useAppSelector(
    (state) => state.auth,
  );
  const activeChatId = useAppSelector((state) => state.chat.activeChatId);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const activeChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId ?? null;
  }, [activeChatId]);

  useEffect(() => {
    if (!accessToken || !currentUserId) return;

    socketService.connect(accessToken);
    const socket = socketService.getSocket();
    if (!socket) return;

    const clearUnread = (chatId: string, spaceId?: string | null) => {
      if (spaceId) {
        updateChannelsCache(queryClient, chatId, clearChatUnread, spaceId);
        return;
      }

      updateChannelsCache(queryClient, chatId, clearChatUnread);
      updateDirectMessagesCache(
        queryClient,
        currentUserId,
        clearChatUnread,
        chatId,
      );
    };

    const handleNewMessage = (message: ChatSocketMessagePayload) => {
      const chatId = getMessageChatId(message);
      if (!chatId) return;

      if (isChannelPayload(message)) {
        updateChannelsCache(queryClient, chatId, (channel) => {
          const isThreadReply = !!message.threadParentId;
          const shouldMarkUnread =
            message.senderId !== currentUserId &&
            chatId !== activeChatIdRef.current;
          const isFollowingThread = message.threadFollowers?.some(
            (follower) => isThreadFollowerCurrentUser(follower, currentUserId),
          );
          if (isThreadReply && isFollowingThread) {
            queryClient.invalidateQueries({
              queryKey: chatKeys.followedThreads(currentUserId),
            });
          }
          const hasMention =
            message.mentions?.includes(currentUserId) ||
            message.mentions?.includes("all");

          const updatedChannel = {
            ...channel,
            updatedAt: message.createdAt ?? channel.updatedAt,
            messages: isThreadReply ? channel.messages : [message],
            members: channel.members?.map((member) =>
              member.userId === message.senderId
                ? { ...member, lastReadMessageId: message.id }
                : member,
            ),
          };

          if (shouldMarkUnread) {
            if (isThreadReply && isFollowingThread) {
              updatedChannel.hasUnreadThread = true;
            } else if (!isThreadReply) {
              updatedChannel.unreadCount =
                (updatedChannel.unreadCount ?? 0) + 1;
            }

            if (hasMention) {
              updatedChannel.hasMention = true;
            }
          }

          return updatedChannel;
        });
        return;
      }

      const hasConversationInCache = hasCachedDirectConversation(
        queryClient,
        chatId,
      );

      updateDirectMessagesCache(
        queryClient,
        currentUserId,
        (directMessage) => {
          if (message.threadParentId) {
            const isFollowing = message.threadFollowers?.some((threadFollower) =>
              isThreadFollowerCurrentUser(threadFollower, currentUserId),
            );
            if (isFollowing) {
              queryClient.invalidateQueries({
                queryKey: chatKeys.followedThreads(currentUserId),
              });
            }
            return {
              ...directMessage,
              hasUnreadThread:
                message.senderId !== currentUserId && isFollowing
                  ? true
                  : directMessage.hasUnreadThread,
            };
          }

          const shouldMarkUnread =
            message.senderId !== currentUserId &&
            chatId !== activeChatIdRef.current;
          return {
            ...directMessage,
            updatedAt: message.createdAt ?? directMessage.updatedAt,
            messages: [message],
            unreadCount: shouldMarkUnread
              ? (directMessage.unreadCount ?? 0) + 1
              : directMessage.unreadCount,
            hasMention:
              shouldMarkUnread &&
              (message.mentions?.includes(currentUserId) ||
                message.mentions?.includes("all"))
                ? true
                : directMessage.hasMention,
            members: directMessage.members?.map((member) =>
              member.userId === message.senderId
                ? { ...member, lastReadMessageId: message.id }
                : member,
            ),
          };
        },
        chatId,
      );

      if (!hasConversationInCache) {
        queryClient.invalidateQueries({
          queryKey: chatKeys.directMessages(currentUserId),
        });
      }
    };

    const handleMessageUpdated = (message: ChatSocketMessagePayload) => {
      const chatId = getMessageChatId(message);
      if (!chatId) return;

      if (isChannelPayload(message)) {
        updateChannelsCache(queryClient, chatId, (channel) =>
          channel.messages?.[0]?.id === message.id
            ? { ...channel, messages: [message] }
            : channel,
        );
        return;
      }

      updateDirectMessagesCache(
        queryClient,
        currentUserId,
        (directMessage) =>
          directMessage.messages?.[0]?.id === message.id
            ? { ...directMessage, messages: [message] }
            : directMessage,
        chatId,
      );
    };

    const handleMessageRead = (data: ChatSocketReadPayload) => {
      const chatId = getMessageChatId(data);
      if (!chatId) return;

      if (data.userId === currentUserId) {
        clearUnread(chatId, data.channelId ? undefined : null);
      }

      if (isChannelPayload(data)) {
        updateChannelsCache(queryClient, chatId, (channel) =>
          patchChatMember(channel, data.userId, {
            lastReadMessageId: data.messageId,
          }),
        );
        return;
      }

      updateDirectMessagesCache(
        queryClient,
        currentUserId,
        (directMessage) =>
          patchChatMember(
            data.userId === currentUserId
              ? clearChatUnread(directMessage)
              : directMessage,
            data.userId,
            { lastReadMessageId: data.messageId },
          ),
        chatId,
      );
    };

    const handleMemberJoin = (data: ChatSocketMemberPayload) => {
      const chatId = getMessageChatId(data);
      if (!chatId) return;

      if (isChannelPayload(data)) {
        if (!data.member) {
          queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
          return;
        }
        const memberPayload = data.member;
        updateChannelsCache(queryClient, chatId, (channel) => {
          const members = channel.members || [];
          const alreadyMember = members.some(
            (member) => member.userId === memberPayload.userId,
          );
          return {
            ...channel,
            members: alreadyMember
              ? members.map((member) =>
                  member.userId === memberPayload.userId
                    ? { ...member, ...memberPayload }
                    : member,
                )
              : [...members, memberPayload],
          };
        });
        return;
      }

      updateDirectMessagesCache(
        queryClient,
        currentUserId,
        (directMessage) => {
          const alreadyMember = directMessage.members?.some(
            (member) => member.userId === data.member?.userId,
          );
          if (alreadyMember || !data.member) return directMessage;

          const memberPayload = data.member;
          return {
            ...directMessage,
            members: [...(directMessage.members || []), memberPayload],
          };
        },
        chatId,
      );
    };

    const handleMemberKickedOrLeft = (data: ChatSocketMemberPayload) => {
      const chatId = getMessageChatId(data);
      const affectsCurrentUser =
        data.userId === currentUserId ||
        data.affectedUserIds?.includes(currentUserId);

      if (isChannelPayload(data)) {
        if (affectsCurrentUser && data.leftSpace && data.spaceId) {
          dispatch(setActiveConversation(null));
          dispatch(setActiveSpaceId(null));
          void cleanupRemovedSpaceCaches(queryClient, data.spaceId).then(() => {
            queryClient.invalidateQueries({ queryKey: chatKeys.allSpaces() });
          });
          return;
        }

        queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
        if (data.spaceId) {
          queryClient.invalidateQueries({
            queryKey: chatKeys.channels(data.spaceId),
          });
          queryClient.invalidateQueries({
            queryKey: chatKeys.spaceMembers(data.spaceId),
          });
          queryClient.invalidateQueries({
            queryKey: chatKeys.spaceDetails(data.spaceId),
          });
        }
        if (affectsCurrentUser) {
          dispatch(setActiveConversation(null));
        }
        return;
      }

      if (!chatId) return;
      queryClient.invalidateQueries({
        queryKey: chatKeys.directMessages(currentUserId),
      });
    };

    const handleMemberRoleUpdated = (data: ChatSocketRoleUpdatedPayload) => {
      const chatId = getMessageChatId(data);
      if (data.spaceId) {
        patchSpaceMemberRoleInCaches(
          queryClient,
          data.spaceId,
          data.member.userId,
          String(data.member.role) === SpaceRole.ADMIN
            ? SpaceRole.ADMIN
            : SpaceRole.MEMBER,
        );
        queryClient.invalidateQueries({
          queryKey: chatKeys.spaceMembers(data.spaceId),
        });
        queryClient.invalidateQueries({
          queryKey: chatKeys.spaceDetails(data.spaceId),
        });
      }
      if (!chatId || !data.member) {
        queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
        return;
      }

      updateChannelsCache(queryClient, chatId, (channel) =>
        patchChatMember(channel, data.member.userId, {
          role: data.member.role,
        }),
      );
    };

    const handleChannelSettingUpdated = (data: ChatSocketSettingUpdatedPayload) => {
      const chatId = getMessageChatId(data);
      if (data.spaceId) {
        if (
          data.eventType === "space_setting_updated" &&
          isSpaceSetting(data.setting)
        ) {
          patchSpaceSettingInCaches(queryClient, data.spaceId, data.setting);
        }
        queryClient.invalidateQueries({
          queryKey: chatKeys.spaceDetails(data.spaceId),
        });
        queryClient.invalidateQueries({
          queryKey: chatKeys.channels(data.spaceId),
        });
      }
      if (!chatId || !data.setting) return;
      if (data.eventType === "space_setting_updated") return;

      updateChannelsCache(queryClient, chatId, (channel) => ({
        ...channel,
        setting: data.setting as typeof channel.setting,
      }));
    };

    const handleConversationUpdated = (data: ChatSocketUpdatedPayload) => {
      const chatId = getMessageChatId(data) ?? data.id;
      if (data.channelId) {
        updateChannelsCache(queryClient, chatId, (channel) => ({
          ...channel,
          name: data.name ?? channel.name,
          avatarUrl: data.avatarUrl ?? channel.avatarUrl,
        }));
        return;
      }

      updateDirectMessagesCache(
        queryClient,
        currentUserId,
        (directMessage) => ({
          ...directMessage,
          name: data.name ?? directMessage.name,
          avatarUrl: data.avatarUrl ?? directMessage.avatarUrl,
        }),
        data.id,
      );
    };

    const handleConversationDisbanded = (data: ChatSocketDisbandedPayload) => {
      const chatId = getMessageChatId(data);
      const affectsCurrentUser =
        data.affectedUserIds?.includes(currentUserId) || data.leftSpace;

      if (data.spaceId && data.leftSpace && affectsCurrentUser) {
        void cleanupRemovedSpaceCaches(queryClient, data.spaceId).then(() => {
          queryClient.invalidateQueries({ queryKey: chatKeys.allSpaces() });
        });
        queryClient.invalidateQueries({
          queryKey: chatKeys.directMessages(currentUserId),
        });
        dispatch(setActiveConversation(null));
        dispatch(setActiveSpaceId(null));
        return;
      } else if (chatId) {
        removeChannelFromCaches(queryClient, chatId);
      }

      queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
      if (data.spaceId) {
        queryClient.invalidateQueries({ queryKey: chatKeys.allSpaces() });
        queryClient.invalidateQueries({
          queryKey: chatKeys.channels(data.spaceId),
        });
        queryClient.invalidateQueries({
          queryKey: chatKeys.spaceMembers(data.spaceId),
        });
        queryClient.invalidateQueries({
          queryKey: chatKeys.spaceDetails(data.spaceId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: chatKeys.directMessages(currentUserId),
      });
      if (chatId && chatId === activeChatIdRef.current) {
        dispatch(setActiveConversation(null));
      }
      if (data.leftSpace && affectsCurrentUser) {
        dispatch(setActiveConversation(null));
        dispatch(setActiveSpaceId(null));
      }
    };

    const handleConversationMuteUpdated = (data: ChatSocketMuteUpdatedPayload) => {
      const chatId = getMessageChatId(data);
      if (!chatId) return;

      if (isChannelPayload(data)) {
        updateChannelsCache(queryClient, chatId, (channel) =>
          patchChatMember(channel, currentUserId, { muted: data.muted }),
        );
        return;
      }

      updateDirectMessagesCache(
        queryClient,
        currentUserId,
        (directMessage) =>
          patchChatMember(directMessage, currentUserId, {
            muted: data.muted,
          }),
        chatId,
      );
    };

    const handleInvitationProcessed = (data: any) => {
      if (data?.spaceId) {
        queryClient.invalidateQueries({
          queryKey: chatKeys.spaceInvitations(data.spaceId),
        });
      }
    };

    socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);
    socket.on(ChatEvent.MESSAGE_MOVED, handleNewMessage);
    socket.on(ChatEvent.MESSAGE_UPDATED, handleMessageUpdated);
    socket.on(ChatEvent.MESSAGE_READ, handleMessageRead);
    socket.on(ChatEvent.JOIN_CONVERSATION, handleMemberJoin);
    socket.on(ChatEvent.CHANNEL_SETTING_UPDATED, handleChannelSettingUpdated);
    socket.on(ChatEvent.MEMBER_ROLE_UPDATED, handleMemberRoleUpdated);
    socket.on(ChatEvent.MEMBER_KICKED, handleMemberKickedOrLeft);
    socket.on(ChatEvent.MEMBER_LEFT, handleMemberKickedOrLeft);
    socket.on(ChatEvent.CONVERSATION_UPDATED, handleConversationUpdated);
    socket.on(ChatEvent.CONVERSATION_DISBANDED, handleConversationDisbanded);
    socket.on(
      ChatEvent.CONVERSATION_MUTE_UPDATED,
      handleConversationMuteUpdated,
    );
    socket.on(ChatEvent.INVITATION_ACCEPTED, handleInvitationProcessed);
    socket.on(ChatEvent.INVITATION_DECLINED, handleInvitationProcessed);

    return () => {
      socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
      socket.off(ChatEvent.MESSAGE_MOVED, handleNewMessage);
      socket.off(ChatEvent.MESSAGE_UPDATED, handleMessageUpdated);
      socket.off(ChatEvent.MESSAGE_READ, handleMessageRead);
      socket.off(ChatEvent.JOIN_CONVERSATION, handleMemberJoin);
      socket.off(ChatEvent.CHANNEL_SETTING_UPDATED, handleChannelSettingUpdated);
      socket.off(ChatEvent.MEMBER_ROLE_UPDATED, handleMemberRoleUpdated);
      socket.off(ChatEvent.MEMBER_KICKED, handleMemberKickedOrLeft);
      socket.off(ChatEvent.MEMBER_LEFT, handleMemberKickedOrLeft);
      socket.off(ChatEvent.CONVERSATION_UPDATED, handleConversationUpdated);
      socket.off(ChatEvent.CONVERSATION_DISBANDED, handleConversationDisbanded);
      socket.off(
        ChatEvent.CONVERSATION_MUTE_UPDATED,
        handleConversationMuteUpdated,
      );
      socket.off(ChatEvent.INVITATION_ACCEPTED, handleInvitationProcessed);
      socket.off(ChatEvent.INVITATION_DECLINED, handleInvitationProcessed);
      socketService.disconnect();
    };
  }, [accessToken, currentUserId, dispatch, queryClient]);
}
