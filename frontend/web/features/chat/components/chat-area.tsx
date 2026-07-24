"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ChatInput, { ChatInputRef } from "./input/chat-input";
import ChatHeader from "./chat-header";
import ChatMessage from "./message/chat-message";
import { PinnedMessagesBar } from "./pinned-messages-bar";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { getConversationMessages, getPinnedMessages } from "../api/chat.api";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import TimeDivider from "./message/time-divider";
import { ChevronDown, X } from "lucide-react";
import CreatePollModal from "./modals/create-poll-modal";
import CreateNoteModal from "./modals/create-note-modal";
import TypingIndicator from "./message/typing-indicator";
import {
  updateWatermark,
  setWatermarks,
  setHighlightMessageId,
  updateGroupSettings,
  updateMemberRole,
  removeMember,
  setActiveConversation,
  updateConversationInfo,
  setActiveThreadRootMessage,
} from "@/store/chat/chat-slice";
import { NO_AVATAR_TYPES } from "../types/chat.types";
import { toast } from "sonner";

import { useChatMemberProfiles } from "../hooks/useChatMemberProfiles";

type PageParam = {
  cursor?: string;
  direction: "older" | "newer" | "around";
};

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
  const { activeConversation, watermarks } = useAppSelector(
    (state) => state.chat,
  );
  const memberProfiles = useChatMemberProfiles();
  const auth = useAppSelector((state) => state.auth);
  const highlightMessageId = useAppSelector(
    (state) => state.chat.highlightMessageId,
  );
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const [newSocketMessages, setNewSocketMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<
    { id: string; name: string }[]
  >([]);
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [jumpTargetId, setJumpTargetId] = useState<string | null>(null);

  // Fetch pinned messages
  const { data: pinnedMessages = [] } = useQuery({
    queryKey: ["pinnedMessages", activeConversation?.id],
    queryFn: async () => {
      const res = await getPinnedMessages(activeConversation!.id);
      return res.data || [];
    },
    enabled: !!activeConversation?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

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
    queryKey: ["messages", activeConversation?.id, jumpTargetId],
    queryFn: async ({ pageParam }) => {
      const response = await getConversationMessages(
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

  // Reset jump target when conversation changes
  useEffect(() => {
    setJumpTargetId(null);
  }, [activeConversation?.id]);

  // (Moved jump target to below handleJumpToMessage)

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
      dispatch(setWatermarks(initialWatermarks));
    }
  }, [activeConversation, dispatch]);

  useEffect(() => {
    const socket = socketService.getSocket();

    if (socket && activeConversation?.id) {
      socket.emit(ChatEvent.JOIN_CONVERSATION, {
        conversationId: activeConversation.id,
      });

      const handleNewMessage = (message: any) => {
        if (message.conversationId === activeConversation?.id) {
          setNewSocketMessages((prev) => [...prev, message]);

          // Update watermark for the sender implicitly
          dispatch(
            updateWatermark({
              userId: message.senderId,
              messageId: message.id,
            }),
          );

          // Auto scroll to bottom if we are already near bottom, else show badge
          if (isBottomInView || message.senderId === auth.userId) {
            setTimeout(() => scrollToBottom(), 100);
          }
        }
      };

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
          ["messages", activeConversation.id, jumpTargetId],
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

      const handleReactionUpdated = (data: any) => {
        if (data.conversationId === activeConversation.id) {
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
        conversationId: string;
        userId: string;
        messageId: string;
      }) => {
        if (data.conversationId === activeConversation.id) {
          dispatch(
            updateWatermark({ userId: data.userId, messageId: data.messageId }),
          );
        }
      };

      const handlePollUpdated = (data: any) => {
        if (data.conversationId === activeConversation.id) {
          updateMessageInState(data.messageId, (msg) => {
            return { ...msg, poll: data.poll };
          });
        }
      };

      const handleMessageMoved = (msg: any) => {
        if (msg.conversationId === activeConversation.id) {
          // Xoá tin nhắn cũ
          setNewSocketMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== msg.id);
            return [msg, ...filtered];
          });

          queryClient.setQueryData(
            ["messages", activeConversation.id, jumpTargetId],
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
        if (msg.conversationId === activeConversation.id) {
          queryClient.setQueryData<any[]>(["pinnedMessages", activeConversation.id], (prev) => {
            const currentList = prev || [];
            const exists = currentList.some((p) => p.id === msg.id);
            if (exists) return currentList;
            // Add to top
            return [msg, ...currentList].sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
            );
          });
          updateMessageInState(msg.id, () => msg);
        }
      };

      const handleMessageUnpinned = (msg: any) => {
        if (msg.conversationId === activeConversation.id) {
          queryClient.setQueryData<any[]>(["pinnedMessages", activeConversation.id], (prev) => {
            const currentList = prev || [];
            return currentList.filter((p) => p.id !== msg.id);
          });
          updateMessageInState(msg.id, () => msg);
        }
      };

      const handleMessageUpdated = (msg: any) => {
        if (msg.conversationId === activeConversation.id) {
          updateMessageInState(msg.id, () => msg);
        }
      };

      const handleTyping = (data: {
        conversationId: string;
        userId: string;
        isTyping: boolean;
      }) => {
        if (
          data.conversationId === activeConversation.id &&
          data.userId !== auth.userId
        ) {
          if (data.isTyping) {
            setTypingUsers((prev) => {
              if (prev.find((u) => u.id === data.userId)) return prev;
              const name = memberProfiles?.[data.userId]?.fullName || "Ai đó";
              return [...prev, { id: data.userId, name }];
            });

            if (typingTimeoutsRef.current[data.userId]) {
              clearTimeout(typingTimeoutsRef.current[data.userId]);
            }
            // Auto remove after 5 seconds just in case
            typingTimeoutsRef.current[data.userId] = setTimeout(() => {
              setTypingUsers((prev) =>
                prev.filter((u) => u.id !== data.userId),
              );
              delete typingTimeoutsRef.current[data.userId];
            }, 5000);
          } else {
            setTypingUsers((prev) => prev.filter((u) => u.id !== data.userId));
            if (typingTimeoutsRef.current[data.userId]) {
              clearTimeout(typingTimeoutsRef.current[data.userId]);
              delete typingTimeoutsRef.current[data.userId];
            }
          }
        }
      };

      const handleGroupSettingUpdated = (data: any) => {
        if (data.conversationId === activeConversation.id) {
          dispatch(updateGroupSettings(data.setting));
        }
      };

      const handleMemberRoleUpdated = (data: any) => {
        if (data.conversationId === activeConversation.id) {
          dispatch(
            updateMemberRole({
              userId: data.member.userId,
              role: data.member.role,
            }),
          );
        }
      };

      const handleMemberKickedOrLeft = (data: any) => {
        if (data.conversationId === activeConversation.id) {
          if (data.userId === auth?.userId) {
            dispatch(setActiveConversation(null));
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            toast.success("Bạn đã không còn ở trong nhóm này");
          } else {
            dispatch(removeMember(data.userId));
          }
        }
      };

      const handleConversationDisbanded = (data: any) => {
        if (data.conversationId === activeConversation.id) {
          dispatch(setActiveConversation(null));
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          toast.info("Nhóm này đã bị giải tán bởi Trưởng nhóm");
        }
      };

      const handleConversationUpdated = (data: any) => {
        if (data.id === activeConversation.id) {
          dispatch(updateConversationInfo(data));
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
      socket.on(ChatEvent.GROUP_SETTING_UPDATED, handleGroupSettingUpdated);
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
        socket.off(ChatEvent.GROUP_SETTING_UPDATED, handleGroupSettingUpdated);
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
    auth.userId,
    memberProfiles,
    dispatch,
    queryClient,
  ]);

  const allMessages = useMemo(() => {
    if (!data?.pages) return [...newSocketMessages].reverse();
    const pagesMessages = data.pages.flatMap((page: any) =>
      [...page.messages].reverse(),
    );
    return [...[...newSocketMessages].reverse(), ...pagesMessages];
  }, [data?.pages, newSocketMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSendMessage = useCallback(
    (content: string, medias?: any[], mentions?: string[]) => {
      const socket = socketService.getSocket();
      if (socket && activeConversation?.id) {
        if (editingMessage) {
          socket.emit(ChatEvent.EDIT_MESSAGE, {
            conversationId: activeConversation.id,
            messageId: editingMessage.id,
            content,
          });
          setEditingMessage(null);
        } else {
          socket.emit(ChatEvent.SEND_MESSAGE, {
            conversationId: activeConversation?.id,
            content,
            medias,
            replyToMessageId: replyingTo?.id,
            mentions,
          });
          setReplyingTo(null);
        }
      }
    },
    [activeConversation?.id, replyingTo, editingMessage],
  );

  const handleTypingChange = useCallback(
    (isTyping: boolean) => {
      const socket = socketService.getSocket();
      if (socket && activeConversation?.id) {
        socket.emit(ChatEvent.TYPING, {
          conversationId: activeConversation.id,
          isTyping,
        });
      }
    },
    [activeConversation?.id],
  );

  const handleCreatePoll = useCallback(
    (data: any) => {
      if (!activeConversation) return;
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.SEND_MESSAGE, {
          conversationId: activeConversation.id,
          content: "",
          type: "POLL",
          pollData: data,
        });
      }
    },
    [activeConversation],
  );

  const handleRecallMessage = useCallback(
    (msg: any) => {
      const socket = socketService.getSocket();
      if (socket && activeConversation?.id) {
        socket.emit(ChatEvent.RECALL_MESSAGE, {
          conversationId: activeConversation.id,
          messageId: msg.id,
        });
      }
    },
    [activeConversation?.id],
  );

  const handlePinMessage = useCallback(
    (msg: any) => {
      const socket = socketService.getSocket();
      if (socket && activeConversation?.id) {
        if (msg.pinned) {
          socket.emit(
            ChatEvent.UNPIN_MESSAGE,
            {
              conversationId: activeConversation.id,
              messageId: msg.id,
            },
            (response: any) => {
              if (response?.status === "error") toast.error(response.message);
            },
          );
        } else {
          socket.emit(
            ChatEvent.PIN_MESSAGE,
            {
              conversationId: activeConversation.id,
              messageId: msg.id,
            },
            (response: any) => {
              if (response?.status === "error") toast.error(response.message);
            },
          );
        }
      }
    },
    [activeConversation?.id],
  );

  const handleCreateNote = useCallback(
    (data: any) => {
      if (!activeConversation) return;
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.SEND_MESSAGE, {
          conversationId: activeConversation.id,
          content: "",
          type: "NOTE",
          noteData: data,
        });
      }
    },
    [activeConversation?.id],
  );

  const handleReactMessage = useCallback(
    (messageId: string, emoji: string, action: "add" | "remove") => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.REACT_MESSAGE, {
          conversationId: activeConversation?.id,
          messageId,
          emoji,
          action,
        });
      }
    },
    [activeConversation?.id],
  );

  const handlePollVoteMessage = useCallback(
    (messageId: string, pollOptionId: string) => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(ChatEvent.VOTE_POLL, {
          conversationId: activeConversation?.id,
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
          conversationId: activeConversation?.id,
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
          conversationId: activeConversation?.id,
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
          conversationId: activeConversation?.id,
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
          Đang tải...
        </div>
      );
    }

    if (allMessages.length === 0) {
      return (
        <div className="flex justify-center items-center h-full text-gray-400">
          Chưa có tin nhắn nào. Hãy gửi lời chào!
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
      if (!isMe && !NO_AVATAR_TYPES.includes(msg.type)) {
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
      if (activeConversation?.type === "GROUP" && !isMe) {
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
          memberProfile={!isMe ? memberProfiles?.[msg.senderId] || null : null}
          memberRole={
            activeConversation?.members?.find(
              (m: any) => m.userId === msg.senderId,
            )?.role
          }
          readBy={Object.keys(watermarks || {}).filter(
            (uid) => watermarks[uid] === msg.id && uid !== auth.userId,
          )}
          showTime={showTime}
          showSenderName={showSenderName}
          onReact={handleReactMessage}
          onPollVote={handlePollVoteMessage}
          onPollAddOption={handlePollAddOptionMessage}
          onPollEdit={handlePollEditMessage}
          onNoteEdit={handleNoteEditMessage}
          onReply={(msgToReply) => {
            setReplyingTo(msgToReply);
            setEditingMessage(null);
            setTimeout(() => {
              chatInputRef.current?.focus();
            }, 50);
          }}
          onEditMessage={(msgToEdit) => {
            setEditingMessage(msgToEdit);
            setReplyingTo(null);
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
        const myWatermark = watermarks?.[auth.userId || ""];
        if (myWatermark !== msg.id) {
          const socket = socketService.getSocket();
          if (socket) {
            socket.emit(ChatEvent.READ_MESSAGE, {
              conversationId: activeConversation.id,
              messageId: msg.id,
            });
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
            <span className="text-xs text-gray-400">Đang tải thêm...</span>
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
              Đang tải tin nhắn mới...
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

      <PinnedMessagesBar
        pinnedMessages={pinnedMessages}
        onJumpToMessage={handleJumpToMessage}
        onUnpin={(messageId) =>
          handlePinMessage({ id: messageId, pinned: true })
        }
        currentUserId={auth.userId!}
      />

      {jumpTargetId && (
        <button
          onClick={() => {
            setJumpTargetId(null);
            setTimeout(scrollToBottom, 100);
          }}
          className="absolute top-20 cursor-pointer shadow-xl left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition z-20 flex items-center gap-2"
        >
          <ChevronDown size={16} />
          Trở về hiện tại
        </button>
      )}

      {/* Message List Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-[#e8e8e8] space-y-1 relative flex flex-col-reverse"
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
          className={`absolute ${replyingTo ? "bottom-40" : "bottom-25"} cursor-pointer shadow-2xl right-6 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-blue-500 hover:bg-gray-50 transition z-10`}
        >
          <ChevronDown size={24} />
        </button>
      )}

      {/* Replying To UI */}
      {replyingTo && (
        <div className="bg-blue-50 border-t border-blue-100 p-2 px-4 flex items-center justify-between">
          <div className="flex flex-col min-w-0 flex-1 border-l-4 border-blue-500 pl-3">
            <span className="text-xs font-semibold text-blue-600">
              Đang trả lời{" "}
              {replyingTo.senderId === auth.userId
                ? "Bạn"
                : memberProfiles?.[replyingTo.senderId]?.fullName || "Ai đó"}
            </span>
            <span className="text-sm text-gray-600 truncate">
              {replyingTo.content ||
                (replyingTo.medias?.length
                  ? "[Đính kèm]"
                  : replyingTo.poll
                    ? "[Bình chọn]"
                    : replyingTo.note
                      ? "[Ghi chú]"
                      : "")}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-blue-100 rounded-full cursor-pointer ml-2 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Editing UI */}
      {editingMessage && (
        <div className="bg-orange-50 border-t border-orange-100 p-2 px-4 flex items-center justify-between">
          <div className="flex flex-col min-w-0 flex-1 border-l-4 border-orange-500 pl-3">
            <span className="text-xs font-semibold text-orange-600">
              Chỉnh sửa tin nhắn
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
      <ChatInput
        ref={chatInputRef}
        onSendMessage={handleSendMessage}
        onCreatePoll={() => setIsPollModalOpen(true)}
        onCreateNote={() => setIsNoteModalOpen(true)}
        onTypingChange={handleTypingChange}
      />

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
    </div>
  );
}
