"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ChannelChatInput, {
  ChannelChatInputRef,
} from "../input/channel-chat-input";
import DirectMessageInput, {
  DirectMessageInputRef,
} from "../input/direct-message-input";
import ChatHeader from "../header/chat-header";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { getSpaceDetails } from "../../api/chat.api";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CreatePollModal from "../modals/message/create-poll-modal";
import CreateNoteModal from "../modals/message/create-note-modal";
import TypingIndicator from "../message/typing-indicator";
import {
  setHighlightMessageId,
  setActiveConversation,
  setActiveSpaceId,
  setActiveThreadRootMessage,
} from "@/store/chat/chat-slice";
import {
  ChatContextType,
  ChatMessageResponse,
  SpaceRole,
  SpaceSettingResponse,
} from "../../types/chat.types";
import {
  ChatSocketMessagePayload,
  ChatSocketMemberPayload,
  ChatSocketRoleUpdatedPayload,
  ChatSocketSettingUpdatedPayload,
  ChatSocketDisbandedPayload,
  ChatSocketUpdatedPayload,
  ChatSocketUnknownPayload,
  ChatSocketAckResponse,
  SendSocketMessageMedia,
} from "../../types/chat-socket.types";
import { ChatQueryKey, ChatScope, chatKeys } from "../../types/chat.constant";
import { SocketAckStatus, ReactionAction } from "../../types/chat.enums";
import { toast } from "sonner";

import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { useDirectMessageActions } from "../../hooks/useDirectMessageActions";
import { useActiveChat } from "../../hooks/useChatQueries";
import { useChatScrollBehavior } from "../../hooks/message/useChatScrollBehavior";
import { useChatReadReceipts } from "../../hooks/message/useChatReadReceipts";
import { useChatTypingIndicator } from "../../hooks/message/useChatTypingIndicator";
import { useChatMessageList } from "../../hooks/message/useChatMessageList";
import { useChatMessageActions } from "../../hooks/message/useChatMessageActions";
import {
  cleanupRemovedSpaceCaches,
  patchSpaceMemberRoleInCaches,
  patchSpaceSettingInCaches,
  removeChannelFromCaches,
} from "../../utils/chat-cache";
import MessageList from "../message/message-list";
import EditingBanner from "./editing-banner";
import JumpToRecentBanner from "./jump-to-recent-banner";
import { RenderableChatMessage } from "../message/chat-message.types";

type ChatInputRef = ChannelChatInputRef | DirectMessageInputRef;

function isSpaceSetting(value: unknown): value is SpaceSettingResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "allowMemberCreateChannel" in value
  );
}

interface ChatAreaProps {
  onToggleRightPanel: () => void;
  onOpenSearch?: () => void;
  onBack?: () => void;
}

export default function ChatArea({
  onToggleRightPanel,
  onOpenSearch,
  onBack,
}: ChatAreaProps) {
  const {
    activeChat: activeConversation,
    activeChatType,
    activeSpaceId,
  } = useActiveChat();
  const auth = useAppSelector((state) => state.auth);
  const highlightMessageId = useAppSelector(
    (state) => state.chat.highlightMessageId,
  );
  const activeThreadRootMessageId = useAppSelector(
    (state) => state.chat.activeThreadRootMessageId,
  );
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const spaceId =
    activeConversation && "spaceId" in activeConversation
      ? activeConversation.spaceId
      : undefined;

  const { data: spaceDetail } = useQuery({
    queryKey: chatKeys.spaceDetails(spaceId || ""),
    queryFn: async () => (await getSpaceDetails(spaceId!)).data,
    enabled: !!spaceId,
  });

  const { markAsRead: markDirectMessageAsRead, sendTyping: sendDirectTyping } =
    useDirectMessageActions();

  const isDirectConversation =
    activeChatType === ChatContextType.DIRECT_MESSAGE;

  // ─── Scroll behavior ───────────────────────────────────────────────────────
  const {
    messagesEndRef,
    chatContainerRef,
    scrollToBottom,
    handleJumpToMessage,
  } = useChatScrollBehavior();

  // ─── Message list (pagination + socket merge) ─────────────────────────────
  const {
    allMessages,
    isLoading,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    jumpTargetId,
    setJumpTargetId,
    loadMoreRef,
    bottomBoundaryRef,
    isBottomInView,
    newSocketMessages,
    setNewSocketMessages,
  } = useChatMessageList({
    activeChatType,
    conversationId: activeConversation?.id,
  });

  // ─── Member profiles ───────────────────────────────────────────────────────
  const messageSenderIds = useMemo(() => {
    const ids = new Set<string>();
    allMessages.forEach((message: ChatMessageResponse) => {
      if (message.senderId) ids.add(message.senderId);
      message.reactions?.forEach((reaction) => {
        if (reaction.userId) ids.add(String(reaction.userId));
      });
    });
    return Array.from(ids);
  }, [allMessages]);

  const activeMemberProfiles = useChatMemberProfiles(messageSenderIds);
  const memberProfiles = useMemo(() => {
    const profiles = { ...activeMemberProfiles };
    allMessages.forEach((message: ChatMessageResponse) => {
      if (message.senderId && message.senderProfile) {
        profiles[message.senderId] = message.senderProfile;
      }
    });
    return profiles;
  }, [activeMemberProfiles, allMessages]);

  // ─── Read receipts ────────────────────────────────────────────────────────
  const { readReceipts, setReadReceipts } = useChatReadReceipts(
    activeConversation?.members,
    activeConversation?.id,
  );

  // ─── Typing indicator ─────────────────────────────────────────────────────
  const { typingUsers, handleTypingEvent } = useChatTypingIndicator(
    auth.userId,
    memberProfiles,
    activeConversation?.id,
  );

  // ─── Editing state ────────────────────────────────────────────────────────
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] =
    useState<ChatMessageResponse | null>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  // ─── Realtime message append ──────────────────────────────────────────────
  const appendRealtimeMessage = useCallback(
    (message: ChatMessageResponse) => {
      if (!message || !activeConversation?.id) return;
      setNewSocketMessages((prev) => {
        const exists = prev.some((item) => item.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
      setReadReceipts((prev) => ({
        ...prev,
        [message.senderId]: message.id,
      }));
      if (isBottomInView || message.senderId === auth.userId) {
        setTimeout(() => scrollToBottom(), 100);
      }
    },
    [
      activeConversation?.id,
      auth.userId,
      isBottomInView,
      scrollToBottom,
      setReadReceipts,
    ],
  );

  // ─── Message actions ──────────────────────────────────────────────────────
  const {
    handleSendMessage: handleSendMessageAction,
    handleRecallMessage,
    handlePinMessage,
    handleReactMessage,
    handleCreatePoll,
    handlePollVoteMessage,
    handlePollAddOptionMessage,
    handlePollEditMessage,
    handleCreateNote,
    handleNoteEditMessage,
    handleReadMessage,
  } = useChatMessageActions({
    conversationId: activeConversation?.id,
    activeChatType,
    isDirectConversation,
    jumpTargetId,
    appendRealtimeMessage,
    scrollToBottom,
  });

  const handleSendMessage = useCallback(
    async (
      content: string,
      medias?: ChatSocketAckResponse["data"] extends infer T ? never : never,
      mentions?: string[],
    ) => {
      await handleSendMessageAction(
        content,
        undefined,
        mentions,
        editingMessage,
        () => {
          setEditingMessage(null);
          chatInputRef.current?.setMessage("");
        },
      );
    },
    [handleSendMessageAction, editingMessage],
  );

  // Fix: correct type for medias in handleSendMessage
  const handleSendMessageWithMedia = useCallback(
    async (
      content: string,
      medias?: SendSocketMessageMedia[],
      mentions?: string[],
    ) => {
      await handleSendMessageAction(
        content,
        medias,
        mentions,
        editingMessage,
        () => {
          setEditingMessage(null);
          chatInputRef.current?.setMessage("");
        },
      );
    },
    [handleSendMessageAction, editingMessage],
  );

  const handleTypingChange = useCallback(
    (isTyping: boolean) => {
      if (activeConversation?.id && isDirectConversation) {
        sendDirectTyping(activeConversation.id, isTyping);
        return;
      }
      const socket = socketService.getSocket();
      if (socket && activeConversation?.id) {
        socket.emit(ChatEvent.TYPING, {
          channelId: activeConversation.id,
          chatId: activeConversation.id,
          chatType: ChatContextType.CHANNEL,
          userId: auth.userId || "",
          isTyping,
        });
      }
    },
    [activeConversation, isDirectConversation, sendDirectTyping, auth.userId],
  );

  // ─── Jump to message (from redux search) ─────────────────────────────────
  useEffect(() => {
    if (highlightMessageId) {
      handleJumpToMessage(highlightMessageId, (id) => setJumpTargetId(id));
      dispatch(setHighlightMessageId(null));
    }
  }, [highlightMessageId, handleJumpToMessage, setJumpTargetId, dispatch]);

  // ─── Update message in state + query cache ────────────────────────────────
  const updateMessageInState = useCallback(
    (
      messageId: string,
      updater: (msg: ChatMessageResponse) => ChatMessageResponse,
    ) => {
      setNewSocketMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? updater(msg) : msg)),
      );
      queryClient.setQueryData(
        chatKeys.messages(activeChatType, activeConversation?.id, jumpTargetId),
        (
          oldData: { pages: { messages: ChatMessageResponse[] }[] } | undefined,
        ) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg.id === messageId ? updater(msg) : msg,
              ),
            })),
          };
        },
      );
    },
    [
      queryClient,
      activeChatType,
      activeConversation?.id,
      jumpTargetId,
      setNewSocketMessages,
    ],
  );

  // ─── Socket event handlers ────────────────────────────────────────────────
  useEffect(() => {
    const socket =
      socketService.getSocket() ||
      (auth.accessToken ? socketService.connect(auth.accessToken) : null);

    if (socket && activeConversation?.id) {
      if (isDirectConversation) {
        socket.emit(ChatEvent.JOIN_DIRECT_CONVERSATION, {
          conversationId: activeConversation.id,
          chatId: activeConversation.id,
          chatType: ChatContextType.DIRECT_MESSAGE,
        });
      } else {
        socket.emit(ChatEvent.JOIN_CONVERSATION, {
          channelId: activeConversation.id,
          chatId: activeConversation.id,
          chatType: ChatContextType.CHANNEL,
        });
      }

      const getEventChannelId = (payload: Record<string, unknown>) =>
        (payload?.channelId ?? payload?.conversationId) as string | undefined;

      const handleNewMessage = (message: ChatSocketMessagePayload) => {
        if (
          getEventChannelId(message as Record<string, unknown>) ===
          activeConversation?.id
        ) {
          if (message.threadParentId) {
            updateMessageInState(message.threadParentId, (parentMsg) => ({
              ...parentMsg,
              threadReplyCount: (parentMsg.threadReplyCount || 0) + 1,
              threadLastReplyAt: message.createdAt,
            }));
            return;
          }
          appendRealtimeMessage(message);
        }
      };

      const handleReactionUpdated = (data: ChatSocketUnknownPayload) => {
        const channelId = (data?.channelId ?? data?.conversationId) as
          | string
          | undefined;
        if (channelId === activeConversation.id) {
          const messageId = String(data.messageId ?? "");
          const userId = String(data.userId ?? "");
          const emoji = String(data.emoji ?? "");
          const action = String(data.action ?? "");
          updateMessageInState(messageId, (msg) => {
            let reactions = Array.isArray(msg.reactions)
              ? [...msg.reactions]
              : [];
            reactions = reactions.filter((r) => r.userId !== userId);
            if (
              action === ReactionAction.ADD ||
              action === ReactionAction.UPDATE
            ) {
              reactions.push({ userId, emoji });
            }
            return { ...msg, reactions };
          });
        }
      };

      const handleMessageRead = (data: {
        channelId?: string;
        conversationId?: string;
        userId: string;
        messageId: string;
      }) => {
        if (
          getEventChannelId(data as Record<string, unknown>) ===
          activeConversation.id
        ) {
          setReadReceipts((prev) => ({
            ...prev,
            [data.userId]: data.messageId,
          }));
        }
      };

      const handlePollUpdated = (data: ChatSocketUnknownPayload) => {
        const channelId = (data?.channelId ?? data?.conversationId) as
          | string
          | undefined;
        if (channelId === activeConversation.id) {
          const messageId = String(data.messageId ?? "");
          updateMessageInState(messageId, (msg) => ({
            ...msg,
            poll: data.poll as ChatMessageResponse["poll"],
          }));
        }
      };

      const handleMessageMoved = (msg: ChatSocketMessagePayload) => {
        if (
          getEventChannelId(msg as Record<string, unknown>) ===
          activeConversation.id
        ) {
          setNewSocketMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== msg.id);
            return [msg, ...filtered];
          });
          queryClient.setQueryData(
            chatKeys.messages(
              activeChatType,
              activeConversation.id,
              jumpTargetId,
            ),
            (
              oldData:
                | { pages: { messages: ChatMessageResponse[] }[] }
                | undefined,
            ) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                pages: oldData.pages.map((page) => ({
                  ...page,
                  messages: page.messages.filter((m) => m.id !== msg.id),
                })),
              };
            },
          );
        }
      };

      const handleMessagePinUnpin = (msg: ChatSocketMessagePayload) => {
        if (
          getEventChannelId(msg as Record<string, unknown>) ===
          activeConversation.id
        ) {
          const conversationScope = isDirectConversation
            ? ChatScope.DIRECT
            : ChatScope.CHANNEL;
          queryClient.invalidateQueries({
            queryKey: chatKeys.pinnedMessagesPreview(
              conversationScope,
              activeConversation.id,
            ),
          });
          queryClient.invalidateQueries({
            queryKey: chatKeys.pinnedMessagesDetail(
              conversationScope,
              activeConversation.id,
            ),
          });
          updateMessageInState(msg.id, () => msg);
        }
      };

      const handleMessageUpdated = (msg: ChatSocketMessagePayload) => {
        if (
          getEventChannelId(msg as Record<string, unknown>) ===
          activeConversation.id
        ) {
          updateMessageInState(msg.id, () => msg);
        }
      };

      const handleTyping = (data: {
        channelId?: string;
        conversationId?: string;
        userId?: string;
        isTyping: boolean;
      }) => {
        if (
          getEventChannelId(data as Record<string, unknown>) ===
          activeConversation.id
        ) {
          handleTypingEvent(data);
        }
      };

      const handleChannelSettingUpdated = (
        data: ChatSocketSettingUpdatedPayload & {
          member?: { userId?: string; role?: string };
        },
      ) => {
        const channelId = data.channelId ?? data.conversationId;
        if (
          channelId === activeConversation.id ||
          data.spaceId === activeSpaceId
        ) {
          if (
            data.eventType === "space_setting_updated" &&
            data.spaceId &&
            isSpaceSetting(data.setting)
          ) {
            patchSpaceSettingInCaches(
              queryClient,
              String(data.spaceId),
              data.setting,
            );
          }
          queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
          if (data.spaceId) {
            if (data.member && typeof data.member === "object") {
              const member = data.member as { userId?: string; role?: string };
              if (member.userId && member.role) {
                patchSpaceMemberRoleInCaches(
                  queryClient,
                  String(data.spaceId),
                  member.userId,
                  String(member.role) === SpaceRole.ADMIN
                    ? SpaceRole.ADMIN
                    : SpaceRole.MEMBER,
                );
              }
            }
            queryClient.invalidateQueries({
              queryKey: chatKeys.channels(String(data.spaceId)),
            });
            queryClient.invalidateQueries({
              queryKey: chatKeys.spaceDetails(String(data.spaceId)),
            });
          }
        }
      };

      const handleMemberRoleUpdated = (data: ChatSocketRoleUpdatedPayload) => {
        if (
          (data.channelId ?? data.conversationId) === activeConversation.id ||
          data.spaceId === activeSpaceId
        ) {
          queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
          if (data.spaceId) {
            queryClient.invalidateQueries({
              queryKey: chatKeys.channels(String(data.spaceId)),
            });
            queryClient.invalidateQueries({
              queryKey: chatKeys.spaceMembers(String(data.spaceId)),
            });
            queryClient.invalidateQueries({
              queryKey: chatKeys.spaceDetails(String(data.spaceId)),
            });
          }
        }
      };
      const handleMemberKickedOrLeft = (data: ChatSocketMemberPayload) => {
        const affectsCurrentUser =
          data.userId === auth?.userId ||
          data.affectedUserIds?.includes(auth?.userId ?? "");
        const affectsActiveConversation =
          (data.channelId ?? data.conversationId) === activeConversation.id ||
          (data.spaceId && data.spaceId === activeSpaceId);

        if (affectsActiveConversation) {
          if (affectsCurrentUser) {
            dispatch(setActiveConversation(null));
            if (data.leftSpace) {
              dispatch(setActiveSpaceId(null));
              if (data.spaceId) {
                void cleanupRemovedSpaceCaches(queryClient, data.spaceId).then(
                  () => {
                    queryClient.invalidateQueries({
                      queryKey: chatKeys.allSpaces(),
                    });
                  },
                );
              }
              queryClient.invalidateQueries({
                queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS],
              });
              toast.success("You are no longer in this space");
            } else {
              queryClient.invalidateQueries({
                queryKey: chatKeys.allChannels(),
              });
              toast.success("You left the channel");
            }
          } else {
            queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
            if (data.spaceId) {
              queryClient.invalidateQueries({
                queryKey: chatKeys.spaceMembers(data.spaceId),
              });
            }
          }
        }
      };

      const handleConversationDisbanded = (
        data: ChatSocketDisbandedPayload,
      ) => {
        const disbandedChannelId = data.channelId ?? data.conversationId;
        const affectsActiveConversation =
          disbandedChannelId === activeConversation.id ||
          data.spaceId === activeSpaceId;

        if (affectsActiveConversation) {
          if (data.leftSpace && data.spaceId) {
            void cleanupRemovedSpaceCaches(queryClient, data.spaceId).then(
              () => {
                queryClient.invalidateQueries({
                  queryKey: chatKeys.allSpaces(),
                });
              },
            );
          } else if (disbandedChannelId) {
            removeChannelFromCaches(queryClient, disbandedChannelId);
            queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
            queryClient.invalidateQueries({ queryKey: chatKeys.allSpaces() });
            if (data.spaceId) {
              queryClient.invalidateQueries({
                queryKey: chatKeys.channels(data.spaceId),
              });
              queryClient.invalidateQueries({
                queryKey: chatKeys.spaceMembers(data.spaceId),
              });
            }
          }
        }

        if (
          disbandedChannelId === activeConversation.id ||
          (data.leftSpace && data.spaceId === activeSpaceId)
        ) {
          dispatch(setActiveConversation(null));
          if (data.leftSpace) {
            dispatch(setActiveSpaceId(null));
          }
          queryClient.invalidateQueries({
            queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS],
          });
          toast.info(
            data.leftSpace
              ? "This space has been disbanded by an admin"
              : "This channel has been disbanded by an admin",
          );
        }
      };

      const handleConversationUpdated = (data: ChatSocketUpdatedPayload) => {
        if (data.id === activeConversation.id) {
          queryClient.invalidateQueries({ queryKey: ["channels"] });
          queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
        }
      };

      socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);
      socket.on(ChatEvent.REACTION_UPDATED, handleReactionUpdated);
      socket.on(ChatEvent.MESSAGE_READ, handleMessageRead);
      socket.on(ChatEvent.POLL_UPDATED, handlePollUpdated);
      socket.on(ChatEvent.MESSAGE_MOVED, handleMessageMoved);
      socket.on(ChatEvent.MESSAGE_UPDATED, handleMessageUpdated);
      socket.on(ChatEvent.TYPING, handleTyping);
      socket.on(ChatEvent.MESSAGE_PINNED, handleMessagePinUnpin);
      socket.on(ChatEvent.MESSAGE_UNPINNED, handleMessagePinUnpin);
      socket.on(ChatEvent.CHANNEL_SETTING_UPDATED, handleChannelSettingUpdated);
      socket.on(ChatEvent.MEMBER_ROLE_UPDATED, handleMemberRoleUpdated);
      socket.on(ChatEvent.MEMBER_KICKED, handleMemberKickedOrLeft);
      socket.on(ChatEvent.MEMBER_LEFT, handleMemberKickedOrLeft);
      socket.on(ChatEvent.CONVERSATION_DISBANDED, handleConversationDisbanded);
      socket.on(ChatEvent.CONVERSATION_UPDATED, handleConversationUpdated);

      return () => {
        socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
        socket.off(ChatEvent.REACTION_UPDATED, handleReactionUpdated);
        socket.off(ChatEvent.MESSAGE_READ, handleMessageRead);
        socket.off(ChatEvent.POLL_UPDATED, handlePollUpdated);
        socket.off(ChatEvent.MESSAGE_MOVED, handleMessageMoved);
        socket.off(ChatEvent.MESSAGE_UPDATED, handleMessageUpdated);
        socket.off(ChatEvent.TYPING, handleTyping);
        socket.off(ChatEvent.MESSAGE_PINNED, handleMessagePinUnpin);
        socket.off(ChatEvent.MESSAGE_UNPINNED, handleMessagePinUnpin);
        socket.off(
          ChatEvent.CHANNEL_SETTING_UPDATED,
          handleChannelSettingUpdated,
        );
        socket.off(ChatEvent.MEMBER_ROLE_UPDATED, handleMemberRoleUpdated);
        socket.off(ChatEvent.MEMBER_KICKED, handleMemberKickedOrLeft);
        socket.off(ChatEvent.MEMBER_LEFT, handleMemberKickedOrLeft);
        socket.off(
          ChatEvent.CONVERSATION_DISBANDED,
          handleConversationDisbanded,
        );
        socket.off(ChatEvent.CONVERSATION_UPDATED, handleConversationUpdated);
      };
    }
  }, [
    activeConversation?.id,
    activeSpaceId,
    activeChatType,
    appendRealtimeMessage,
    isDirectConversation,
    auth.accessToken,
    auth.userId,
    dispatch,
    queryClient,
    jumpTargetId,
    updateMessageInState,
    handleTypingEvent,
    setNewSocketMessages,
    setReadReceipts,
  ]);

  // ─── Jump to recent ────────────────────────────────────────────────────────
  const handleJumpToRecent = useCallback(() => {
    setJumpTargetId(null);
    setNewSocketMessages([]);
    setTimeout(() => scrollToBottom(), 100);
  }, [setJumpTargetId, setNewSocketMessages, scrollToBottom]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-white h-full min-h-0 relative">
      {/* Header */}
      <ChatHeader
        onToggleRightPanel={onToggleRightPanel}
        onOpenSearch={onOpenSearch}
        onBack={onBack}
      />

      {/* Message List Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 bg-[#f8fafc] space-y-1 relative flex flex-col-reverse [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        <div
          ref={(el) => {
            bottomBoundaryRef(el);
            messagesEndRef.current = el;
          }}
          className="h-1 shrink-0"
        />
        <MessageList
          messages={allMessages as RenderableChatMessage[]}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          isFetchingNextPage={isFetchingNextPage}
          isFetchingPreviousPage={isFetchingPreviousPage}
          loadMoreRef={loadMoreRef}
          authUserId={auth.userId}
          activeChatType={activeChatType}
          memberProfiles={memberProfiles}
          readReceipts={readReceipts}
          spaceCreatorId={spaceDetail?.createdBy}
          conversationMembers={activeConversation?.members}
          onReact={(messageId, emoji, action) => {
            // action từ ChatMessage là 'add'|'remove', map sang ReactionAction cho handler
            const reactionAction =
              action === "add" ? ReactionAction.ADD : ReactionAction.REMOVE;
            void handleReactMessage(messageId, emoji, reactionAction);
          }}
          onPollVote={handlePollVoteMessage}
          onPollAddOption={handlePollAddOptionMessage}
          onPollEdit={handlePollEditMessage}
          onNoteEdit={handleNoteEditMessage}
          onEditMessage={(msg) => {
            setEditingMessage(msg);
            setTimeout(() => {
              chatInputRef.current?.setMessage(msg.content || "");
              chatInputRef.current?.focus();
            }, 50);
          }}
          onRecallMessage={handleRecallMessage}
          onJumpToMessage={(msgId) =>
            handleJumpToMessage(msgId, (id) => setJumpTargetId(id))
          }
          onPinMessage={handlePinMessage}
          onThreadReply={(msg) => dispatch(setActiveThreadRootMessage(msg))}
          onReadMessage={handleReadMessage}
          onMarkDirectAsRead={
            isDirectConversation ? markDirectMessageAsRead : undefined
          }
          conversationId={activeConversation?.id}
          isDirectConversation={isDirectConversation}
        />
      </div>

      {/* Floating banner: hiện khi scroll khỏi cuối (lịch sử cũ hoặc scroll lên) */}
      {(!isBottomInView || hasPreviousPage) && allMessages.length > 0 && (
        <JumpToRecentBanner
          isViewingHistory={hasPreviousPage}
          onAction={handleJumpToRecent}
        />
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <EditingBanner
          editingMessage={editingMessage}
          onCancelEdit={() => {
            setEditingMessage(null);
            chatInputRef.current?.setMessage("");
          }}
        />
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && <TypingIndicator typingUsers={typingUsers} />}

      {/* Input Area */}
      {isDirectConversation ? (
        <DirectMessageInput
          ref={chatInputRef}
          onSendMessage={handleSendMessageWithMedia}
          onTypingChange={handleTypingChange}
          placeholder="Message direct conversation..."
          autoFocusOnConversationChange={!activeThreadRootMessageId}
        />
      ) : (
        <ChannelChatInput
          ref={chatInputRef}
          onSendMessage={handleSendMessageWithMedia}
          onCreatePoll={() => setIsPollModalOpen(true)}
          onCreateNote={() => setIsNoteModalOpen(true)}
          onTypingChange={handleTypingChange}
          autoFocusOnChannelChange={!activeThreadRootMessageId}
        />
      )}

      {/* Channel-only modals */}
      {!isDirectConversation && (
        <>
          <CreatePollModal
            isOpen={isPollModalOpen}
            onClose={() => setIsPollModalOpen(false)}
            onSubmit={handleCreatePoll}
          />

          <CreateNoteModal
            isOpen={isNoteModalOpen}
            onClose={() => setIsNoteModalOpen(false)}
            onSubmit={handleCreateNote}
          />
        </>
      )}
    </div>
  );
}
