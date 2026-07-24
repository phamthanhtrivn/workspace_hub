"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, User } from "lucide-react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getThreadMessages } from "../../api/chat.api";
import { socketService } from "../../api/chat-socket.service";
import { ChatEvent } from "../../api/chat.events";
import { useAppSelector } from "@/store/store";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { formatConversationTime } from "@/lib/date";

interface ThreadDetailViewProps {
  rootMessage: any;
  onBack: () => void;
}

export default function ThreadDetailView({
  rootMessage,
  onBack,
}: ThreadDetailViewProps) {
  const [inputText, setInputText] = useState("");
  const queryClient = useQueryClient();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const memberProfiles = useChatMemberProfiles();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch thread messages (root message + replies)
  const { data: threadData, isLoading } = useQuery({
    queryKey: ["threadMessages", rootMessage.id],
    queryFn: () => getThreadMessages(rootMessage.id),
    staleTime: 1000 * 30, // 30s
  });

  const replies = threadData?.data?.replies || [];

  // Listen to new replies via WebSockets
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (msg.threadParentId === rootMessage.id) {
        queryClient.setQueryData(
          ["threadMessages", rootMessage.id],
          (oldData: any) => {
            if (!oldData) return oldData;
            // Prevent duplicate insertion
            const currentReplies = oldData.data?.replies || [];
            if (currentReplies.some((r: any) => r.id === msg.id)) {
              return oldData;
            }
            return {
              ...oldData,
              data: {
                ...oldData.data,
                replies: [...currentReplies, msg],
              },
            };
          },
        );
      }
    };

    socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);
    return () => {
      socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
    };
  }, [rootMessage.id, queryClient]);

  // Scroll to bottom on new replies
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies.length]);

  // Focus input when the thread details view opens or the active thread message changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [rootMessage.id]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit(ChatEvent.SEND_MESSAGE, {
      conversationId: rootMessage.conversationId,
      content: inputText.trim(),
      threadParentId: rootMessage.id,
    });

    setInputText("");
  };

  const getProfile = (userId: string) => {
    return memberProfiles[userId] || null;
  };

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Thảo luận theo chủ đề</h2>
        <button
          onClick={onBack}
          className="cursor-pointer p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Message List area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Root parent message */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center font-bold text-sm text-blue-600 overflow-hidden">
              {getProfile(rootMessage.senderId)?.avatarUrl ? (
                <Image
                  src={getProfile(rootMessage.senderId)!.avatarUrl}
                  alt="Avatar"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <User size={16} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-bold text-xs text-gray-900 truncate">
                  {rootMessage.senderId === currentUserId
                    ? "Bạn"
                    : getProfile(rootMessage.senderId)?.fullName ||
                      "Người dùng"}
                </span>
                <span className="text-[10px] text-gray-400">
                  {formatConversationTime(rootMessage.createdAt)}
                </span>
              </div>
              <div className="text-xs text-gray-800 break-words whitespace-pre-line bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                {rootMessage.content || "[Đính kèm]"}
              </div>
            </div>
          </div>
          <div className="mt-2 pl-11 text-[10px] font-semibold text-gray-500">
            {replies.length} phản hồi
          </div>
        </div>

        {/* Loading / Replies */}
        {isLoading ? (
          <div className="text-center text-xs text-gray-400 py-4">
            Đang tải bình luận...
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map((reply: any) => {
              const profile = getProfile(reply.senderId);
              return (
                <div key={reply.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center font-bold text-xs overflow-hidden">
                    {profile?.avatarUrl ? (
                      <Image
                        src={profile.avatarUrl}
                        alt="Avatar"
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ) : (
                      <User size={14} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <span className="font-bold text-xs text-gray-700 truncate">
                        {reply.senderId === currentUserId
                          ? "Bạn"
                          : profile?.fullName || "Người dùng"}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        {formatConversationTime(reply.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-800 break-words whitespace-pre-line bg-gray-100/50 p-2 rounded-lg">
                      {reply.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-gray-200 flex gap-2 items-center bg-gray-50">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Phản hồi trong chủ đề..."
          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="cursor-pointer p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
