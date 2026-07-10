"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
} from "react";
import ChatInput from "./chat-input";
import ChatHeader from "./chat-header";
import ChatMessage from "./chat-message";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { getConversationMessages } from "../api/chat.api";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import TimeDivider from "./time-divider";
import { ChevronDown, Loader2 } from "lucide-react";
import CreatePollModal from "./create-poll-modal";
import CreateNoteModal from "./create-note-modal";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";

interface ChatAreaProps {
  onToggleRightPanel: () => void;
  onBack?: () => void;
}

export default function ChatArea({
  onToggleRightPanel,
  onBack,
}: ChatAreaProps) {
  const { activeConversation, memberProfiles } = useAppSelector(
    (state) => state.chat,
  );
  const auth = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const [newSocketMessages, setNewSocketMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["messages", activeConversation?.id],
      queryFn: async ({ pageParam }) => {
        const response = await getConversationMessages(
          activeConversation!.id,
          pageParam as string | undefined,
          20,
        );
        return response.data; // { messages: [...], nextCursor: '...' }
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage?.nextCursor,
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

  // Handle socket messages
  useEffect(() => {
    setNewSocketMessages([]); // Reset on conversation change
  }, [activeConversation?.id]);

  useEffect(() => {
    const socket = socketService.getSocket();

    if (socket && activeConversation?.id) {
      socket.emit(ChatEvent.JOIN_CONVERSATION, {
        conversationId: activeConversation.id,
      });

      const handleNewMessage = (message: any) => {
        if (message.conversationId === activeConversation?.id) {
          setNewSocketMessages((prev) => [...prev, message]);

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
          ["messages", activeConversation.id],
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
            const reactions = msg.reactions ? [...msg.reactions] : [];
            if (data.action === "add") {
              reactions.push({ userId: data.userId, emoji: data.emoji });
            } else {
              const idx = reactions.findIndex(
                (r: any) => r.userId === data.userId && r.emoji === data.emoji,
              );
              if (idx !== -1) reactions.splice(idx, 1);
            }
            return { ...msg, reactions };
          });
        }
      };

      const handleMessageRead = (data: any) => {
        if (data.conversationId === activeConversation.id) {
          updateMessageInState(data.messageId, (msg) => {
            const readReceipts = msg.readReceipts ? [...msg.readReceipts] : [];
            const idx = readReceipts.findIndex(
              (r: any) => r.userId === data.userId,
            );
            if (idx === -1) {
              readReceipts.push({ userId: data.userId, readAt: data.readAt });
            } else {
              readReceipts[idx].readAt = data.readAt;
            }
            return { ...msg, readReceipts };
          });
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
            ["messages", activeConversation.id],
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

      socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);
      socket.on(ChatEvent.REACTION_UPDATED, handleReactionUpdated);
      socket.on(ChatEvent.MESSAGE_READ, handleMessageRead);
      socket.on(ChatEvent.POLL_UPDATED, handlePollUpdated);
      socket.on(ChatEvent.MESSAGE_MOVED, handleMessageMoved);

      return () => {
        socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
        socket.off(ChatEvent.REACTION_UPDATED, handleReactionUpdated);
        socket.off(ChatEvent.MESSAGE_READ, handleMessageRead);
        socket.off(ChatEvent.POLL_UPDATED, handlePollUpdated);
        socket.off(ChatEvent.MESSAGE_MOVED, handleMessageMoved);
      };
    }
  }, [activeConversation?.id, auth.userId]);

  const allMessages = useMemo(() => {
    if (!data?.pages) return [...newSocketMessages].reverse();
    const pagesMessages = data.pages.flatMap((page) =>
      [...page.messages].reverse(),
    );
    return [...[...newSocketMessages].reverse(), ...pagesMessages];
  }, [data?.pages, newSocketMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSendMessage = useCallback(
    (content: string, medias?: any[]) => {
      const socket = socketService.getSocket();
      if (socket && activeConversation?.id) {
        socket.emit(ChatEvent.SEND_MESSAGE, {
          conversationId: activeConversation?.id,
          content,
          medias,
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

  const handleReadClick = useCallback(
    (userId: string) => {
      dispatch(setSelectedProfileUserId(userId));
    },
    [dispatch],
  );

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

      const showAvatar =
        !isMe &&
        (i === 0 ||
          allMessages[i - 1].senderId !== msg.senderId ||
          isNewTimeBlockVisually);

      rendered.push(
        <ChatMessage
          key={msg.id}
          msg={msg}
          isMe={isMe}
          showAvatar={showAvatar}
          memberProfile={!isMe ? memberProfiles?.[msg.senderId] || null : null}
          onReact={handleReactMessage}
          onPollVote={handlePollVoteMessage}
          onPollAddOption={handlePollAddOptionMessage}
          onPollEdit={handlePollEditMessage}
          onNoteEdit={handleNoteEditMessage}
          onReadClick={handleReadClick}
        />,
      );

      // Trigger read message if it's not mine and not read yet
      if (!isMe && msg.id && activeConversation?.id) {
        // Optimistically check if I already read it
        const hasRead = msg.readReceipts?.some(
          (r: any) => r.userId === auth.userId,
        );
        if (!hasRead) {
          // Send read receipt if it's visible. For simplicity, just send it if rendered.
          // We can use an IntersectionObserver for real tracking, but here we just emit when rendering if it's recent.
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

    return rendered;
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full min-h-0 relative">
      {/* Header */}
      <ChatHeader onToggleRightPanel={onToggleRightPanel} onBack={onBack} />

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
          className="absolute bottom-25 cursor-pointer shadow-2xl right-6 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-blue-500 hover:bg-gray-50 transition z-10"
        >
          <ChevronDown size={24} />
        </button>
      )}

      {/* Input Area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onCreatePoll={() => setIsPollModalOpen(true)}
        onCreateNote={() => setIsNoteModalOpen(true)}
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
