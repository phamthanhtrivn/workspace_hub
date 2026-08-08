import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
import { updateMuteStatus } from "@/store/chat/chat-slice";

/**
 * Global hook that owns the chat WebSocket connection lifecycle and syncs
 * the ["conversations", userId] React Query cache for all components.
 *
 * Mount this once at the WorkspaceShell level so every page benefits from
 * real-time updates (unread badge, conversation preview, etc.) without each
 * child having to manage its own socket listeners.
 */
export function useChatSocket() {
  const { userId: currentUserId, accessToken } = useAppSelector(
    (state: any) => state.auth,
  );
  const { activeConversation } = useAppSelector((state: any) => state.chat);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  // Keep a ref so socket callbacks always read the latest active conversation
  // without needing to be re-registered every time it changes.
  const activeConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeConversationIdRef.current = activeConversation?.id ?? null;
  }, [activeConversation?.id]);

  useEffect(() => {
    if (!accessToken || !currentUserId) return;

    // Connect (idempotent – socket service guards against double-connect)
    socketService.connect(accessToken);
    const socket = socketService.getSocket();
    if (!socket) return;

    // ─── Handler definitions ──────────────────────────────────────────────

    const handleNewMessage = (message: any) => {
      queryClient.setQueryData(
        ["conversations", currentUserId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const prev: any[] = oldData.conversations;
          const index = prev.findIndex((c) => c.id === message.conversationId);
          if (index === -1) {
            // If the conversation is not in the user's sidebar list (e.g. new conversation),
            // invalidate queries to refetch the conversations list in real-time.
            queryClient.invalidateQueries({
              queryKey: ["conversations", currentUserId],
            });
            return oldData;
          }

          const conv = { ...prev[index] };

          if (message.threadParentId) {
            // Thread reply – don't bump, only flag unread thread
            if (message.senderId !== currentUserId) {
              conv.hasUnreadThread = true;
            }
            const updated = [...prev];
            updated[index] = conv;
            return { ...oldData, conversations: updated };
          }

          // Normal message – bump to top and update preview
          conv.updatedAt = message.createdAt;
          conv.messages = [message];

          if (
            message.senderId !== currentUserId &&
            message.conversationId !== activeConversationIdRef.current
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
          updated.splice(index, 1);
          updated.unshift(conv);
          return { ...oldData, conversations: updated };
        },
      );
    };

    const handleMessageUpdated = (message: any) => {
      queryClient.setQueryData(
        ["conversations", currentUserId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const prev: any[] = oldData.conversations;
          const index = prev.findIndex((c) => c.id === message.conversationId);
          if (index === -1) return oldData;

          const conv = { ...prev[index] };
          // Only update snippet if the edited/recalled msg is the latest one
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
      conversationId: string;
      userId: string;
      messageId: string;
    }) => {
      queryClient.setQueryData(
        ["conversations", currentUserId],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            conversations: oldData.conversations.map((c: any) => {
              if (c.id !== data.conversationId) return c;
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
      queryClient.setQueryData(
        ["conversations", currentUserId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const updatedProfiles = data.profile
            ? { ...oldData.profiles, [data.profile.id]: data.profile }
            : oldData.profiles;
          return {
            ...oldData,
            profiles: updatedProfiles,
            conversations: oldData.conversations.map((c: any) => {
              if (c.id !== data.conversationId) return c;
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
      if (data.userId === currentUserId) {
        // Current user removed – force a full refetch so the conversation disappears
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      } else {
        queryClient.setQueryData(
          ["conversations", currentUserId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              conversations: oldData.conversations.map((c: any) => {
                if (c.id !== data.conversationId) return c;
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

    const handleConversationUpdated = (data: {
      id: string;
      name?: string;
      avatarUrl?: string;
    }) => {
      queryClient.setQueryData(
        ["conversations", currentUserId],
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

    const handleConversationDisbanded = (_data: { conversationId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleConversationMuteUpdated = (data: {
      conversationId: string;
      muted: boolean;
    }) => {
      queryClient.setQueryData(
        ["conversations", currentUserId],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            conversations: oldData.conversations.map((c: any) => {
              if (c.id !== data.conversationId) return c;
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
          conversationId: data.conversationId,
          userId: currentUserId!,
          muted: data.muted,
        }),
      );
    };

    // ─── Register listeners ───────────────────────────────────────────────
    socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);
    socket.on(ChatEvent.MESSAGE_MOVED, handleNewMessage);
    socket.on(ChatEvent.MESSAGE_UPDATED, handleMessageUpdated);
    socket.on(ChatEvent.MESSAGE_READ, handleMessageRead);
    socket.on(ChatEvent.JOIN_CONVERSATION, handleMemberJoin);
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
      socket.off(ChatEvent.MEMBER_KICKED, handleMemberKickedOrLeft);
      socket.off(ChatEvent.MEMBER_LEFT, handleMemberKickedOrLeft);
      socket.off(ChatEvent.CONVERSATION_UPDATED, handleConversationUpdated);
      socket.off(ChatEvent.CONVERSATION_DISBANDED, handleConversationDisbanded);
      socket.off(
        ChatEvent.CONVERSATION_MUTE_UPDATED,
        handleConversationMuteUpdated,
      );
    };
  }, [accessToken, currentUserId, queryClient, dispatch]);
}
