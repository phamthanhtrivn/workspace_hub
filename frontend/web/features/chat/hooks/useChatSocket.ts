import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  clearSpaceChannelUnread,
  patchSpaceChannel,
  removeSpaceChannelMember,
  updateMuteStatus,
  updateSpaceChannelMember,
  upsertSpaceChannelMember,
} from "@/store/chat/chat-slice";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
import { ChatQueryKey } from "../types/chat.constant";
import { sortDirectConversations } from "../utils/direct-conversation-utils";

export function useChatSocket() {
  const { userId: currentUserId, accessToken } = useAppSelector(
    (state: any) => state.auth,
  );
  const { activeConversation } = useAppSelector((state: any) => state.chat);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const activeConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeConversationIdRef.current = activeConversation?.id ?? null;
  }, [activeConversation?.id]);

  const getEventChannelId = (payload: any) =>
    payload?.channelId ?? payload?.conversationId;

  useEffect(() => {
    if (!accessToken || !currentUserId) return;

    socketService.connect(accessToken);
    const socket = socketService.getSocket();
    if (!socket) return;

    const isChannelEvent = (payload: any) =>
      !!payload?.channelId && !payload?.conversationId;

    const updateChannelQueryData = (
      channelId: string,
      updater: (channel: any) => any,
    ) => {
      let didUpdate = false;
      queryClient.setQueriesData({ queryKey: ["channels"] }, (oldData: any) => {
        if (!oldData?.channels) return oldData;
        return {
          ...oldData,
          channels: oldData.channels.map((channel: any) => {
            if (channel.id !== channelId) return channel;
            didUpdate = true;
            return updater(channel);
          }),
        };
      });

      if (!didUpdate) {
        queryClient.invalidateQueries({ queryKey: ["channels"] });
      }
    };

    const clearChannelUnread = (channelId: string, spaceId?: string) => {
      dispatch(clearSpaceChannelUnread({ channelId, spaceId }));
      updateChannelQueryData(channelId, (channel) => ({
        ...channel,
        unreadCount: 0,
        hasMention: false,
        hasUnreadThread: false,
      }));
    };

    const handleNewMessage = (message: any) => {
      const eventChannelId = getEventChannelId(message);
      if (!eventChannelId) return;

      if (isChannelEvent(message)) {
        updateChannelQueryData(eventChannelId, (channel) => {
          const isThreadReply = !!message.threadParentId;
          const shouldMarkUnread =
            message.senderId !== currentUserId &&
            eventChannelId !== activeConversationIdRef.current;
          const isFollowingThread = message.threadFollowers?.some(
            (follower: any) =>
              typeof follower === "string"
                ? follower === currentUserId
                : follower.userId === currentUserId,
          );
          const hasMention =
            message.mentions?.includes(currentUserId) ||
            message.mentions?.includes("all");

          const updatedChannel = {
            ...channel,
            updatedAt: message.createdAt ?? channel.updatedAt,
            messages: isThreadReply ? channel.messages : [message],
            members: channel.members?.map((member: any) =>
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

          dispatch(
            patchSpaceChannel({
              spaceId: channel.spaceId,
              channelId: eventChannelId,
              changes: updatedChannel,
            }),
          );

          return updatedChannel;
        });
        return;
      }

      queryClient.setQueryData(
        [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const prev: any[] = oldData.conversations;
          const index = prev.findIndex((c) => c.id === eventChannelId);
          if (index === -1) {
            queryClient.invalidateQueries({
              queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
            });
            return oldData;
          }

          const conv = { ...prev[index] };

          if (message.threadParentId) {
            const isFollowing = message.threadFollowers?.some((tf: any) =>
              typeof tf === "string"
                ? tf === currentUserId
                : tf.userId === currentUserId,
            );
            if (message.senderId !== currentUserId && isFollowing) {
              conv.hasUnreadThread = true;
            }
            const updated = [...prev];
            updated[index] = conv;
            return {
              ...oldData,
              conversations: sortDirectConversations(updated, currentUserId),
            };
          }

          conv.updatedAt = message.createdAt;
          conv.messages = [message];

          if (
            message.senderId !== currentUserId &&
            eventChannelId !== activeConversationIdRef.current
          ) {
            conv.unreadCount = (conv.unreadCount ?? 0) + 1;
            if (
              message.mentions?.includes(currentUserId) ||
              message.mentions?.includes("all")
            ) {
              conv.hasMention = true;
            }
          }

          if (conv.members) {
            conv.members = conv.members.map((m: any) =>
              m.userId === message.senderId
                ? { ...m, lastReadMessageId: message.id }
                : m,
            );
          }

          const updated = [...prev];
          updated[index] = conv;
          return {
            ...oldData,
            conversations: sortDirectConversations(updated, currentUserId),
          };
        },
      );
    };

    const handleMessageUpdated = (message: any) => {
      const eventChannelId = getEventChannelId(message);
      if (!eventChannelId) return;

      if (isChannelEvent(message)) {
        updateChannelQueryData(eventChannelId, (channel) => {
          if (channel.messages?.[0]?.id !== message.id) return channel;
          const updatedChannel = { ...channel, messages: [message] };
          dispatch(
            patchSpaceChannel({
              spaceId: channel.spaceId,
              channelId: eventChannelId,
              changes: updatedChannel,
            }),
          );
          return updatedChannel;
        });
        return;
      }

      queryClient.setQueryData(
        [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const prev: any[] = oldData.conversations;
          const index = prev.findIndex((c) => c.id === eventChannelId);
          if (index === -1) return oldData;

          const conv = { ...prev[index] };
          if (conv.messages?.[0]?.id === message.id) {
            conv.messages = [message];
            const updated = [...prev];
            updated[index] = conv;
            return { ...oldData, conversations: updated };
          }
          return oldData;
        },
      );
    };

    const handleMessageRead = (data: {
      channelId?: string;
      conversationId?: string;
      userId: string;
      messageId: string;
    }) => {
      const eventChannelId = getEventChannelId(data);
      if (!eventChannelId) return;

      if (isChannelEvent(data)) {
        if (data.userId === currentUserId) {
          clearChannelUnread(eventChannelId);
        }
        dispatch(
          updateSpaceChannelMember({
            channelId: eventChannelId,
            userId: data.userId,
            changes: { lastReadMessageId: data.messageId },
          }),
        );
        updateChannelQueryData(eventChannelId, (channel) => ({
          ...channel,
          members: channel.members?.map((member: any) =>
            member.userId === data.userId
              ? { ...member, lastReadMessageId: data.messageId }
              : member,
          ),
        }));
        return;
      }

      queryClient.setQueryData(
        [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            conversations: oldData.conversations.map((c: any) => {
              if (c.id !== eventChannelId) return c;
              const updated = { ...c };
              if (data.userId === currentUserId) {
                updated.unreadCount = 0;
                updated.hasMention = false;
              }
              if (updated.members) {
                updated.members = updated.members.map((m: any) =>
                  m.userId === data.userId
                    ? { ...m, lastReadMessageId: data.messageId }
                    : m,
                );
              }
              return updated;
            }),
          };
        },
      );
    };

    const handleMemberJoin = (data: any) => {
      const eventChannelId = getEventChannelId(data);
      if (!eventChannelId) return;

      if (isChannelEvent(data)) {
        if (data.member) {
          dispatch(
            upsertSpaceChannelMember({
              channelId: eventChannelId,
              member: data.member,
            }),
          );
          updateChannelQueryData(eventChannelId, (channel) => {
            const members = channel.members || [];
            const alreadyMember = members.some(
              (member: any) => member.userId === data.member.userId,
            );
            return {
              ...channel,
              members: alreadyMember
                ? members.map((member: any) =>
                    member.userId === data.member.userId
                      ? { ...member, ...data.member }
                      : member,
                  )
                : [...members, data.member],
            };
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ["channels"] });
        }
        return;
      }

      queryClient.setQueryData(
        [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const updatedProfiles = data.profile
            ? { ...oldData.profiles, [data.profile.id]: data.profile }
            : oldData.profiles;
          return {
            ...oldData,
            profiles: updatedProfiles,
            conversations: oldData.conversations.map((c: any) => {
              if (c.id !== eventChannelId) return c;
              const updated = { ...c };
              const alreadyMember = updated.members?.some(
                (m: any) => m.userId === data.member?.userId,
              );
              if (!alreadyMember && updated.members && data.member) {
                updated.members = [...updated.members, data.member];
              }
              return updated;
            }),
          };
        },
      );
    };

    const handleMemberKickedOrLeft = (data: any) => {
      const eventChannelId = getEventChannelId(data);
      if (!eventChannelId) return;

      if (isChannelEvent(data)) {
        if (data.userId === currentUserId) {
          queryClient.invalidateQueries({ queryKey: ["channels"] });
        } else {
          dispatch(
            removeSpaceChannelMember({
              spaceId: data.spaceId,
              channelId: eventChannelId,
              userId: data.userId,
            }),
          );
          updateChannelQueryData(eventChannelId, (channel) => ({
            ...channel,
            members: channel.members?.filter(
              (member: any) => member.userId !== data.userId,
            ),
          }));
        }
        return;
      }

      if (data.userId === currentUserId) {
        queryClient.invalidateQueries({
          queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS],
        });
      } else {
        queryClient.setQueryData(
          [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              conversations: oldData.conversations.map((c: any) => {
                if (c.id !== eventChannelId) return c;
                const updated = { ...c };
                if (updated.members) {
                  updated.members = updated.members.filter(
                    (m: any) => m.userId !== data.userId,
                  );
                }
                return updated;
              }),
            };
          },
        );
      }
    };

    const handleMemberRoleUpdated = (data: any) => {
      const eventChannelId = getEventChannelId(data);
      if (!eventChannelId || !data.member) return;

      dispatch(
        updateSpaceChannelMember({
          channelId: eventChannelId,
          userId: data.member.userId,
          changes: { role: data.member.role },
        }),
      );
      updateChannelQueryData(eventChannelId, (channel) => ({
        ...channel,
        members: channel.members?.map((member: any) =>
          member.userId === data.member.userId
            ? { ...member, role: data.member.role }
            : member,
        ),
      }));
    };

    const handleChannelSettingUpdated = (data: any) => {
      const eventChannelId = getEventChannelId(data);
      if (!eventChannelId || !data.setting) return;

      updateChannelQueryData(eventChannelId, (channel) => {
        const updatedChannel = { ...channel, setting: data.setting };
        dispatch(
          patchSpaceChannel({
            spaceId: channel.spaceId,
            channelId: eventChannelId,
            changes: updatedChannel,
          }),
        );
        return updatedChannel;
      });
    };

    const handleConversationUpdated = (data: {
      id: string;
      channelId?: string;
      name?: string;
      avatarUrl?: string;
    }) => {
      const eventChannelId = getEventChannelId(data) ?? data.id;
      if (data.channelId) {
        updateChannelQueryData(eventChannelId, (channel) => {
          const updatedChannel = {
            ...channel,
            name: data.name !== undefined ? data.name : channel.name,
            avatarUrl:
              data.avatarUrl !== undefined ? data.avatarUrl : channel.avatarUrl,
          };
          dispatch(
            patchSpaceChannel({
              spaceId: channel.spaceId,
              channelId: eventChannelId,
              changes: updatedChannel,
            }),
          );
          return updatedChannel;
        });
        return;
      }

      queryClient.setQueryData(
        [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            conversations: oldData.conversations.map((c: any) => {
              if (c.id !== data.id) return c;
              return {
                ...c,
                name: data.name !== undefined ? data.name : c.name,
                avatarUrl:
                  data.avatarUrl !== undefined ? data.avatarUrl : c.avatarUrl,
              };
            }),
          };
        },
      );
    };

    const handleConversationDisbanded = (_data: {
      channelId?: string;
      conversationId?: string;
    }) => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      queryClient.invalidateQueries({
        queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS],
      });
    };

    const handleConversationMuteUpdated = (data: {
      channelId?: string;
      conversationId?: string;
      muted: boolean;
    }) => {
      const eventChannelId = getEventChannelId(data);
      if (!eventChannelId) return;

      if (isChannelEvent(data)) {
        dispatch(
          updateSpaceChannelMember({
            channelId: eventChannelId,
            userId: currentUserId,
            changes: { muted: data.muted },
          }),
        );
        updateChannelQueryData(eventChannelId, (channel) => ({
          ...channel,
          members: channel.members?.map((member: any) =>
            member.userId === currentUserId
              ? { ...member, muted: data.muted }
              : member,
          ),
        }));
      }

      queryClient.setQueryData(
        [ChatQueryKey.DIRECT_CONVERSATIONS, currentUserId],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            conversations: oldData.conversations.map((c: any) => {
              if (c.id !== eventChannelId) return c;
              return {
                ...c,
                members: c.members?.map((m: any) =>
                  m.userId === currentUserId ? { ...m, muted: data.muted } : m,
                ),
              };
            }),
          };
        },
      );

      dispatch(
        updateMuteStatus({
          conversationId: eventChannelId,
          userId: currentUserId,
          muted: data.muted,
        }),
      );
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
      socketService.disconnect();
    };
  }, [accessToken, currentUserId, queryClient, dispatch]);
}
