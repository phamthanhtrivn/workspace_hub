"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ConversationChatInput, { ConversationChatInputRef } from "./input/conversation-chat-input";
import DirectMessageInput, {
  DirectMessageInputRef,
} from "./input/direct-message-input";
import ChatHeader from "./chat-header";
import ChatMessage from "./message/chat-message";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { getConversationMessages } from "../api/chat.api";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import TimeDivider from "./message/time-divider";
import { ChevronDown, X } from "lucide-react";
import CreatePollModal from "./modals/create-poll-modal";
import CreateNoteModal from "./modals/create-note-modal";
import TypingIndicator from "./message/typing-indicator";
import {
  setHighlightMessageId,
  setActiveConversation,
  setActiveThreadRootMessage,
} from "@/store/chat/chat-slice";
import {
  ChatContextType,
  ChatMessageResponse,
  NO_AVATAR_TYPES,
} from "../types/chat.types";
import {
  ChatSocketAckResponse,
  SendSocketMessageMedia,
} from "../types/chat-socket.types";
import { ChatQueryKey, chatKeys } from "../types/chat.constant";
import { toast } from "sonner";

import { useChatMemberProfiles } from "../hooks/useChatMemberProfiles";
import { useDirectMessageActions } from "../hooks/useDirectMessageActions";
import { useActiveChat } from "../hooks/useChatQueries";

type ChatReaction = {
  userId?: string;
};

type ChatMessageItem = {
  senderId?: string;
  reactions?: ChatReaction[];
};

type PageParam = {
  cursor?: string;
  direction: "older" | "newer" | "around";
};

type ChatInputRef = ConversationChatInputRef | DirectMessageInputRef;

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
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const {
    editMessage: editDirectChatMessage,
    getMessages: getDirectMessages,
    markAsRead: markDirectMessageAsRead,
    reactToMessage: reactToDirectMessage,
    recallMessage: recallDirectChatMessage,
    sendTyping: sendDirectTyping,
    sendMessage: sendDirectChatMessage,
    togglePinMessage: toggleDirectPinMessage,
  } = useDirectMessageActions();

  const [newSocketMessages, setNewSocketMessages] = useState<
    ChatMessageResponse[]
  >([]);
  const [readReceipts, setReadReceipts] = useState<Record<string, string>>({});
  const [typingUsers, setTypingUsers] = useState<
    { id: string; name: string }[]
  >([]);
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [jumpTargetId, setJumpTargetId] = useState<string | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    fetchPreviousPage,
    hasPreviousPage,
    isFetchingPreviousPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: chatKeys.messages(
      activeChatType,
      activeConversation?.id,
      jumpTargetId,
    ),
    queryFn: async ({ pageParam }) => {
      const fetchMessages =
        activeChatType === ChatContextType.DIRECT_MESSAGE
          ? getDirectMessages
          : getConversationMessages;
      const response = await fetchMessages(
        activeConversation!.id,
        pageParam?.cursor,
        20,
        pageParam?.direction || "older",
      );
      return response.data; // { messages: [...], nextCursor: '...', prevCursor: '...' }
    },
    initialPageParam: (jumpTargetId
      ? { cursor: jumpTargetId, direction: "around" }
      : { cursor: undefined, direction: "older" }) as PageParam,
    getNextPageParam: (lastPage): PageParam | undefined =>
      lastPage?.nextCursor
        ? { cursor: lastPage.nextCursor, direction: "older" }
        : undefined,
    getPreviousPageParam: (firstPage): PageParam | undefined =>
      firstPage?.prevCursor
        ? { cursor: firstPage.prevCursor, direction: "newer" }
        : undefined,
    enabled: !!activeConversation?.id,
  });

  const { ref: loadMoreRef, inView } = useInView();
  const { ref: bottomBoundaryRef, inView: isBottomInView } = useInView();

  const messagePages = data?.pages;
  const allMessages = useMemo(() => {
    if (!messagePages) return [...newSocketMessages].reverse();
    const pagesMessages = messagePages.flatMap((page) =>
      [...page.messages].reverse(),
    );
    return [...[...newSocketMessages].reverse(), ...pagesMessages];
  }, [messagePages, newSocketMessages]);

  const messageSenderIds = useMemo(() => {
    const ids = new Set<string>();
    allMessages.forEach((message: ChatMessageItem) => {
      if (message.senderId) {
        ids.add(message.senderId);
      }
      message.reactions?.forEach((reaction) => {
        if (reaction.userId) {
          ids.add(reaction.userId);
        }
      });
    });
    return Array.from(ids);
  }, [allMessages]);

  const memberProfiles = useChatMemberProfiles(messageSenderIds);
  const isDirectConversation =
    activeChatType === ChatContextType.DIRECT_MESSAGE;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const appendRealtimeMessage = useCallback(
    (message: any) => {
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
    [activeConversation?.id, auth.userId, isBottomInView, scrollToBottom],
  );

  useEffect(() => {
    setJumpTargetId(null);
  }, [activeConversation?.id]);

  // Load more when scrolled to the top
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Load more when scrolled to the bottom
  useEffect(() => {
    if (isBottomInView && hasPreviousPage && !isFetchingPreviousPage) {
      fetchPreviousPage();
    }
  }, [
    isBottomInView,
    hasPreviousPage,
    isFetchingPreviousPage,
    fetchPreviousPage,
  ]);

  // Handle socket messages
  useEffect(() => {
    setNewSocketMessages([]); // Reset on conversation change
    setTypingUsers([]);
    Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    typingTimeoutsRef.current = {};

    if (activeConversation?.members) {
      const initialWatermarks: Record<string, string> = {};
      activeConversation.members.forEach((m: any) => {
        if (m.lastReadMessageId) {
          initialWatermarks[m.userId] = m.lastReadMessageId;
        }
      });
      setReadReceipts(initialWatermarks);
    }
  }, [activeConversation]);

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

      const getEventChannelId = (payload: any) =>
        payload?.channelId ?? payload?.conversationId;

      const updateMessageInState = (
        messageId: string,
        updater: (msg: any) => any,
      ) => {
        // Update newSocketMessages
        setNewSocketMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? updater(msg) : msg)),
        );

        // Update react-query cache
        queryClient.setQueryData(
          chatKeys.messages(activeChatType, activeConversation.id, jumpTargetId),
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                messages: page.messages.map((msg: any) =>
                  msg.id === messageId ? updater(msg) : msg,
                ),
              })),
            };
          },
        );
      };

      const handleNewMessage = (message: any) => {
        if (getEventChannelId(message) === activeConversation?.id) {
          if (message.threadParentId) {
            // It's a thread reply. Update parent message's thread info in state/cache.
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

      const handleReactionUpdated = (data: any) => {
        if (getEventChannelId(data) === activeConversation.id) {
          updateMessageInState(data.messageId, (msg) => {
            let reactions = msg.reactions ? [...msg.reactions] : [];
            // Remove any existing reaction from this user
            reactions = reactions.filter((r: any) => r.userId !== data.userId);

            if (data.action === "add" || data.action === "update") {
              reactions.push({ userId: data.userId, emoji: data.emoji });
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
        if (getEventChannelId(data) === activeConversation.id) {
          setReadReceipts((prev) => ({
            ...prev,
            [data.userId]: data.messageId,
          }));
        }
      };

      const handlePollUpdated = (data: any) => {
        if (getEventChannelId(data) === activeConversation.id) {
          updateMessageInState(data.messageId, (msg) => {
            return { ...msg, poll: data.poll };
          });
        }
      };

      const handleMessageMoved = (msg: any) => {
        if (getEventChannelId(msg) === activeConversation.id) {
          // Xoá tin nhắn cũ
          setNewSocketMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== msg.id);
            return [msg, ...filtered];
          });

          queryClient.setQueryData(
            chatKeys.messages(activeChatType, activeConversation.id, jumpTargetId),
            (oldData: any) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  messages: page.messages.filter((m: any) => m.id !== msg.id),
                })),
              };
            },
          );
        }
      };

      const handleMessagePinned = (msg: any) => {
        if (getEventChannelId(msg) === activeConversation.id) {
          const conversationScope =
            isDirectConversation ? "direct" : "channel";
          queryClient.invalidateQueries({
            queryKey: [
              "pinnedMessagesPreview",
              conversationScope,
              activeConversation.id,
            ],
          });
          queryClient.invalidateQueries({
            queryKey: [
              "pinnedMessagesDetail",
              conversationScope,
              activeConversation.id,
            ],
          });
          updateMessageInState(msg.id, () => msg);
        }
      };

      const handleMessageUnpinned = (msg: any) => {
        if (getEventChannelId(msg) === activeConversation.id) {
          const conversationScope =
            isDirectConversation ? "direct" : "channel";
          queryClient.invalidateQueries({
            queryKey: [
              "pinnedMessagesPreview",
              conversationScope,
              activeConversation.id,
            ],
          });
          queryClient.invalidateQueries({
            queryKey: [
              "pinnedMessagesDetail",
              conversationScope,
              activeConversation.id,
            ],
          });
          updateMessageInState(msg.id, () => msg);
        }
      };

      const handleMessageUpdated = (msg: any) => {
        if (getEventChannelId(msg) === activeConversation.id) {
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
          data.userId &&
          getEventChannelId(data) === activeConversation.id &&
          data.userId !== auth.userId
        ) {
          const typingUserId = data.userId;
          if (data.isTyping) {
            setTypingUsers((prev) => {
              if (prev.find((u) => u.id === typingUserId)) return prev;
              const name =
                memberProfiles?.[typingUserId]?.fullName || "Someone";
              return [...prev, { id: typingUserId, name }];
            });

            if (typingTimeoutsRef.current[typingUserId]) {
              clearTimeout(typingTimeoutsRef.current[typingUserId]);
            }
            // Auto remove after 5 seconds just in case
            typingTimeoutsRef.current[typingUserId] = setTimeout(() => {
              setTypingUsers((prev) =>
                prev.filter((u) => u.id !== typingUserId),
              );
              delete typingTimeoutsRef.current[typingUserId];
            }, 5000);
          } else {
            setTypingUsers((prev) => prev.filter((u) => u.id !== typingUserId));
            if (typingTimeoutsRef.current[typingUserId]) {
              clearTimeout(typingTimeoutsRef.current[typingUserId]);
              delete typingTimeoutsRef.current[typingUserId];
            }
          }
        }
      };

      const handleChannelSettingUpdated = (data: any) => {
        if (getEventChannelId(data) === activeConversation.id) {
          queryClient.invalidateQueries({ queryKey: ["channels"] });
        }
      };

      const handleMemberRoleUpdated = (data: any) => {
        if (getEventChannelId(data) === activeConversation.id) {
          queryClient.invalidateQueries({ queryKey: ["channels"] });
        }
      };

      const handleMemberKickedOrLeft = (data: any) => {
        const affectsActiveConversation =
          getEventChannelId(data) === activeConversation.id ||
          (data.spaceId && data.spaceId === activeSpaceId);

        if (affectsActiveConversation) {
          if (data.userId === auth?.userId) {
            dispatch(setActiveConversation(null));
            queryClient.invalidateQueries({
              queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS],
            });
            queryClient.invalidateQueries({ queryKey: ["channels"] });
            toast.success("You are no longer in this space");
          } else {
            queryClient.invalidateQueries({ queryKey: ["channels"] });
          }
        }
      };

      const handleConversationDisbanded = (data: any) => {
        if (getEventChannelId(data) === activeConversation.id) {
          dispatch(setActiveConversation(null));
          queryClient.invalidateQueries({
            queryKey: [ChatQueryKey.DIRECT_CONVERSATIONS],
          });
          toast.info("This channel has been disbanded by the Owner");
        }
      };

      const handleConversationUpdated = (data: any) => {
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
      socket.on(ChatEvent.MESSAGE_PINNED, handleMessagePinned);
      socket.on(ChatEvent.MESSAGE_UNPINNED, handleMessageUnpinned);
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
        socket.off(ChatEvent.MESSAGE_PINNED, handleMessagePinned);
        socket.off(ChatEvent.MESSAGE_UNPINNED, handleMessageUnpinned);
        socket.off(ChatEvent.CHANNEL_SETTING_UPDATED, handleChannelSettingUpdated);
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
    memberProfiles,
    dispatch,
    queryClient,
  ]);

  const handleSendMessage = useCallback(
    async (
      content: string,
      medias?: SendSocketMessageMedia[],
      mentions?: string[],
    ) => {
      const socket = socketService.getSocket();
      if (activeConversation?.id) {
        if (editingMessage) {
          if (isDirectConversation) {
            try {
              const edited = await editDirectChatMessage(
                activeConversation.id,
                editingMessage.id,
                content,
              );
              if (edited) {
                setEditingMessage(null);
              }
              return;
            } catch {
              return;
            }
          }
          if (!socket) return;
          socket.emit(ChatEvent.EDIT_MESSAGE, {
            channelId: activeConversation.id,
            messageId: editingMessage.id,
            content,
          });
          setEditingMessage(null);
        } else {
          if (isDirectConversation) {
            await sendDirectChatMessage({
              conversationId: activeConversation.id,
              content,
              medias,
              mentions,
              onSent: () => {
                setTimeout(() => scrollToBottom(), 100);
              },
            });
            return;
          }
          if (!socket) return;
          socket.emit(
            ChatEvent.SEND_MESSAGE,
            {
              channelId: activeConversation.id,
              chatId: activeConversation.id,
              chatType: ChatContextType.CHANNEL,
              content,
              medias,
              mentions,
            },
            (response: ChatSocketAckResponse) => {
              if (response?.status === "success" && response.data) {
                appendRealtimeMessage(response.data);
              } else if (response?.message) {
                toast.error(response.message);
              }
            },
          );
        }
      }
    },
    [
      activeConversation,
      editingMessage,
      editDirectChatMessage,
      appendRealtimeMessage,
      scrollToBottom,
      sendDirectChatMessage,
    ],
  );

  const handleTypingChange = useCallback(
    (isTyping: boolean) => {
      const socket = socketService.getSocket();
      if (activeConversation?.id && isDirectConversation) {
        sendDirectTyping(activeConversation.id, isTyping);
        return;
      }

      if (socket && activeConversation?.id) {
        socket.emit(
          ChatEvent.TYPING,
          {
            channelId: activeConversation.id,
            chatId: activeConversation.id,
            chatType: ChatContextType.CHANNEL,
            userId: auth.userId || "",
            isTyping,
          },
        );
      }
    },
    [activeConversation, sendDirectTyping],
  );

  const handleCreatePoll = useCallback(
    (data: any) => {
      if (!activeConversation) return;
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.SEND_MESSAGE, {
          channelId: activeConversation.id,
          chatId: activeConversation.id,
          chatType: ChatContextType.CHANNEL,
          content: "",
          type: "POLL",
          pollData: data,
        });
      }
    },
    [activeConversation],
  );

  const handleRecallMessage = useCallback(
    async (msg: any) => {
      const socket = socketService.getSocket();
      if (activeConversation?.id) {
        if (isDirectConversation) {
          try {
            await recallDirectChatMessage(
              activeConversation.id,
              msg.id,
            );
          } catch {
          }
          return;
        }
        if (!socket) return;
        socket.emit(ChatEvent.RECALL_MESSAGE, {
          channelId: activeConversation.id,
          messageId: msg.id,
        });
      }
    },
    [activeConversation, recallDirectChatMessage],
  );

  const handlePinMessage = useCallback(
    async (msg: any) => {
      const socket = socketService.getSocket();
      if (activeConversation?.id) {
        if (isDirectConversation) {
          try {
            await toggleDirectPinMessage(
              activeConversation.id,
              msg,
            );
          } catch {
          }
          return;
        }
        if (!socket) return;
        if (msg.pinned) {
          socket.emit(
            ChatEvent.UNPIN_MESSAGE,
            {
              channelId: activeConversation.id,
              chatId: activeConversation.id,
              chatType: ChatContextType.CHANNEL,
              messageId: msg.id,
            },
            (response: ChatSocketAckResponse) => {
              if (response?.status === "error") toast.error(response.message);
            },
          );
        } else {
          socket.emit(
            ChatEvent.PIN_MESSAGE,
            {
              channelId: activeConversation.id,
              chatId: activeConversation.id,
              chatType: ChatContextType.CHANNEL,
              messageId: msg.id,
            },
            (response: ChatSocketAckResponse) => {
              if (response?.status === "error") toast.error(response.message);
            },
          );
        }
      }
    },
    [activeConversation, toggleDirectPinMessage],
  );

  const handleCreateNote = useCallback(
    (data: any) => {
      if (!activeConversation) return;
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.SEND_MESSAGE, {
          channelId: activeConversation.id,
          chatId: activeConversation.id,
          chatType: ChatContextType.CHANNEL,
          content: "",
          type: "NOTE",
          noteData: data,
        });
      }
    },
    [activeConversation?.id],
  );

  const handleReactMessage = useCallback(
    async (messageId: string, emoji: string, action: "add" | "remove") => {
      const socket = socketService.getSocket();
      if (activeConversation?.id && isDirectConversation) {
        try {
          await reactToDirectMessage(
            activeConversation.id,
            messageId,
            emoji,
          );
        } catch {
        }
        return;
      }
      if (socket) {
        socket.emit(ChatEvent.REACT_MESSAGE, {
          channelId: activeConversation?.id,
          messageId,
          emoji,
          action,
        });
      }
    },
    [activeConversation, reactToDirectMessage],
  );

  const handlePollVoteMessage = useCallback(
    (messageId: string, pollOptionId: string) => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.VOTE_POLL, {
          channelId: activeConversation?.id,
          messageId,
          pollOptionId,
        });
      }
    },
    [activeConversation?.id],
  );

  const handlePollAddOptionMessage = useCallback(
    (messageId: string, text: string) => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.ADD_POLL_OPTION, {
          channelId: activeConversation?.id,
          messageId,
          text,
        });
      }
    },
    [activeConversation?.id],
  );

  const handlePollEditMessage = useCallback(
    (
      messageId: string,
      title: string,
      multipleChoice: boolean,
      allowAddOptions: boolean,
      anonymous: boolean,
      isLocked: boolean,
    ) => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.EDIT_POLL, {
          channelId: activeConversation?.id,
          messageId,
          title,
          multipleChoice,
          allowAddOptions,
          anonymous,
          isLocked,
        });
      }
    },
    [activeConversation?.id],
  );

  const handleNoteEditMessage = useCallback(
    (messageId: string, title: string, content: string) => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.EDIT_NOTE, {
          channelId: activeConversation?.id,
          messageId,
          title,
          content,
        });
      }
    },
    [activeConversation?.id],
  );

  const handleJumpToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-blue-200", "transition-all", "duration-500");
      setTimeout(() => el.classList.remove("bg-blue-200"), 1500);
    } else {
      setJumpTargetId(messageId);
      setTimeout(() => {
        const newEl = document.getElementById(`msg-${messageId}`);
        if (newEl) {
          newEl.scrollIntoView({ behavior: "auto", block: "center" });
          newEl.classList.add("bg-blue-200", "transition-all", "duration-500");
          setTimeout(() => newEl.classList.remove("bg-blue-200"), 1500);
        }
      }, 800);
    }
  }, []);

  // Handle jump target from redux search
  useEffect(() => {
    if (highlightMessageId) {
      handleJumpToMessage(highlightMessageId);
      dispatch(setHighlightMessageId(null));
    }
  }, [highlightMessageId, handleJumpToMessage, dispatch]);

  const renderMessages = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-full text-gray-400">
          Loading...
        </div>
      );
    }

    if (allMessages.length === 0) {
      return (
        <div className="flex justify-center items-center h-full text-gray-400">
          No messages here yet. Say hello!
        </div>
      );
    }

    const rendered = [];

    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];
      const nextMsg = i < allMessages.length - 1 ? allMessages[i + 1] : null;
      const prevMsg = i > 0 ? allMessages[i - 1] : null;

      const isMe = msg.senderId === auth.userId;

      let isNewTimeBlockVisually = false;
      if (prevMsg) {
        const currentMsgTime = new Date(msg.createdAt).getTime();
        const prevMsgTime = new Date(prevMsg.createdAt).getTime();
        if (prevMsgTime - currentMsgTime > 6 * 60 * 60 * 1000) {
          isNewTimeBlockVisually = true;
        } else {
          const currDate = new Date(msg.createdAt);
          const prevDate = new Date(prevMsg.createdAt);
          if (
            currDate.getDate() !== prevDate.getDate() ||
            currDate.getMonth() !== prevDate.getMonth() ||
            currDate.getFullYear() !== prevDate.getFullYear()
          ) {
            isNewTimeBlockVisually = true;
          }
        }
      }

      let showAvatar = false;
      if (!NO_AVATAR_TYPES.includes(msg.type)) {
        if (
          i === 0 ||
          allMessages[i - 1].senderId !== msg.senderId ||
          NO_AVATAR_TYPES.includes(allMessages[i - 1].type) ||
          isNewTimeBlockVisually
        ) {
          showAvatar = true;
        }
      }

      let showTime = true;
      if (prevMsg) {
        const currentMsgTime = new Date(msg.createdAt).getTime();
        const prevMsgTime = new Date(prevMsg.createdAt).getTime();
        if (
          prevMsg.senderId === msg.senderId &&
          prevMsgTime - currentMsgTime <= 5 * 60 * 1000
        ) {
          showTime = false;
        }
      }

      let showSenderName = false;
      if (!isMe || activeChatType === ChatContextType.CHANNEL) {
        if (!nextMsg) {
          showSenderName = true;
        } else {
          const currentMsgTime = new Date(msg.createdAt).getTime();
          const nextMsgTime = new Date(nextMsg.createdAt).getTime();
          if (
            nextMsg.senderId !== msg.senderId ||
            currentMsgTime - nextMsgTime > 5 * 60 * 1000 ||
            NO_AVATAR_TYPES.includes(nextMsg.type)
          ) {
            showSenderName = true;
          }
        }
      }

      rendered.push(
        <ChatMessage
          key={msg.id}
          msg={msg}
          isMe={isMe}
          showAvatar={showAvatar}
          memberProfile={memberProfiles?.[msg.senderId] || null}
          memberProfiles={memberProfiles || {}}
          memberRole={
            activeConversation?.members?.find(
              (m: any) => m.userId === msg.senderId,
            )?.role
          }
          readBy={Object.keys(readReceipts || {}).filter(
            (uid) => readReceipts[uid] === msg.id && uid !== auth.userId,
          )}
          showTime={showTime}
          showSenderName={showSenderName}
          onReact={handleReactMessage}
          onPollVote={handlePollVoteMessage}
          onPollAddOption={handlePollAddOptionMessage}
          onPollEdit={handlePollEditMessage}
          onNoteEdit={handleNoteEditMessage}
          onEditMessage={(msgToEdit) => {
            setEditingMessage(msgToEdit);
            setTimeout(() => {
              chatInputRef.current?.setMessage(msgToEdit.content || "");
              chatInputRef.current?.focus();
            }, 50);
          }}
          onRecallMessage={handleRecallMessage}
          onJumpToMessage={handleJumpToMessage}
          onPinMessage={handlePinMessage}
          onThreadReply={(msgToThread) => {
            dispatch(setActiveThreadRootMessage(msgToThread));
          }}
        />,
      );

      // Trigger read message if it's the newest message and not read yet
      if (!isMe && msg.id && activeConversation?.id && i === 0) {
        // i === 0 means it's the newest message because we iterate in reverse
        const myWatermark = readReceipts?.[auth.userId || ""];
        if (myWatermark !== msg.id) {
          const socket = socketService.getSocket();
          if (isDirectConversation) {
            void markDirectMessageAsRead(activeConversation.id, msg.id);
          } else if (socket) {
            socket.emit(
              ChatEvent.READ_MESSAGE,
              {
                channelId: activeConversation.id,
                chatId: activeConversation.id,
                chatType: ChatContextType.CHANNEL,
                messageId: msg.id,
              },
            );
          }
        }
      }

      // Determine TimeDivider (visually ABOVE `msg`, so pushed AFTER `msg` in flex-col-reverse)
      let showDividerAbove = false;
      if (!nextMsg) {
        showDividerAbove = true; // Always show above the oldest message
      } else {
        const currentMsgTime = new Date(msg.createdAt).getTime();
        const nextMsgTime = new Date(nextMsg.createdAt).getTime();
        if (currentMsgTime - nextMsgTime > 6 * 60 * 60 * 1000) {
          showDividerAbove = true;
        } else {
          const currDate = new Date(msg.createdAt);
          const nextDate = new Date(nextMsg.createdAt);
          if (
            currDate.getDate() !== nextDate.getDate() ||
            currDate.getMonth() !== nextDate.getMonth() ||
            currDate.getFullYear() !== nextDate.getFullYear()
          ) {
            showDividerAbove = true;
          }
        }
      }

      if (showDividerAbove) {
        rendered.push(
          <TimeDivider key={`divider-${msg.id}`} date={msg.createdAt} />,
        );
      }
    }

    // Add load more ref at the END of the array (visually at the TOP)
    if (hasNextPage) {
      rendered.push(
        <div
          key="load-more"
          ref={loadMoreRef}
          className="h-6 w-full flex justify-center items-center my-2"
        >
          {isFetchingNextPage && (
            <span className="text-xs text-gray-400">Loading more...</span>
          )}
        </div>,
      );
    }

    if (hasPreviousPage) {
      rendered.unshift(
        <div
          key="load-more-newer"
          className="h-6 w-full flex justify-center items-center my-2 shrink-0"
        >
          {isFetchingPreviousPage && (
            <span className="text-xs text-gray-400">
              Loading new messages...
            </span>
          )}
        </div>,
      );
    }

    return rendered;
  };

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
        {renderMessages()}
      </div>

      {!isBottomInView && allMessages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-30 cursor-pointer shadow-2xl right-6 w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center bg-blue-500 text-white hover:text-gray-50 hover:bg-blue-700 transition z-10"
        >
          <ChevronDown size={24} />
        </button>
      )}

      {/* Editing UI */}
      {editingMessage && (
        <div className="bg-orange-50 border-t border-orange-100 p-2 px-4 flex items-center justify-between">
          <div className="flex flex-col min-w-0 flex-1 border-l-4 border-orange-500 pl-3">
            <span className="text-xs font-semibold text-orange-600">
              Edit message
            </span>
            <span className="text-sm text-gray-600 truncate">
              {editingMessage.content}
            </span>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              chatInputRef.current?.setMessage("");
            }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-orange-100 rounded-full cursor-pointer ml-2 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {typingUsers.length > 0 && <TypingIndicator typingUsers={typingUsers} />}

      {/* Input Area */}
      {isDirectConversation ? (
        <DirectMessageInput
          ref={chatInputRef}
          onSendMessage={handleSendMessage}
          onTypingChange={handleTypingChange}
          placeholder="Message direct conversation..."
        />
      ) : (
        <ConversationChatInput
          ref={chatInputRef}
          onSendMessage={handleSendMessage}
          onCreatePoll={() => setIsPollModalOpen(true)}
          onCreateNote={() => setIsNoteModalOpen(true)}
          onTypingChange={handleTypingChange}
        />
      )}

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
