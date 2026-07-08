"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ChatInput from "./chat-input";
import ChatHeader from "./chat-header";
import ChatMessage from "./chat-message";
import { useAppSelector } from "@/store/store";
import { getConversationMessages } from "../api/chat.api";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";

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

  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (activeConversation?.id) {
        try {
          const response = await getConversationMessages(activeConversation.id);
          setMessages(response?.success ? response.data : []);
        } catch (error) {
          console.error("Failed to fetch messages", error);
        }
      }
    };

    fetchHistory();
  }, [activeConversation?.id]);

  useEffect(() => {
    const socket = socketService.getSocket();

    if (socket && activeConversation?.id) {
      socket.emit(ChatEvent.JOIN_CONVERSATION, {
        conversationId: activeConversation.id,
      });

      const handleNewMessage = (message: any) => {
        if (message.conversationId === activeConversation?.id) {
          setMessages((prev) => [...prev, message]);
        }
      };

      socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);

      return () => {
        socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
      };
    }
  }, [activeConversation?.id]);

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

  return (
    <div className="flex-1 flex flex-col bg-white h-full min-h-0">
      {/* Header */}
      <ChatHeader onToggleRightPanel={onToggleRightPanel} onBack={onBack} />

      {/* Message List Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-200 space-y-1">
        {messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-400">
            Chưa có tin nhắn nào. Hãy gửi lời chào!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === auth.userId;
            const showAvatar =
              !isMe &&
              (index === 0 || messages[index - 1].senderId !== msg.senderId);

            return (
              <ChatMessage
                key={msg.id}
                msg={msg}
                isMe={isMe}
                showAvatar={showAvatar}
                memberProfile={
                  !isMe ? memberProfiles?.[msg.senderId] || null : null
                }
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}
