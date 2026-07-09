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
import { useAppSelector } from "@/store/store";
import { getConversationMessages } from "../api/chat.api";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import TimeDivider from "./time-divider";
import { ChevronDown } from "lucide-react";

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

  const [newSocketMessages, setNewSocketMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

      socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);

      return () => {
        socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
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
        />,
      );

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
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}
