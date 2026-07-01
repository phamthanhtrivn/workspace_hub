"use client";

import React, { useEffect, useState, useRef } from "react";
import ChatInput from "./ChatInput";
import ChatHeader from "./ChatHeader";
import ChatMessage from "./ChatMessage";
import { useAppSelector } from "@/store/store";
import { getConversationMessages, getPublicProfile } from "../api/chat.api";
import { UserProfileResponse } from "../types/chat.types";
import { socketService } from "../api/socket.service";
import { ChatEvent } from "../api/chat.events";

interface ChatAreaProps {
  onToggleRightPanel: () => void;
  onBack?: () => void;
}

export default function ChatArea({
  onToggleRightPanel,
  onBack,
}: ChatAreaProps) {
  const memberProfile = useAppSelector((state) => state.chat.memberProfile);
  const activeConversationId = useAppSelector(
    (state) => state.chat.activeConversationId,
  );
  const auth = useAppSelector((state) => state.auth);

  const [messages, setMessages] = useState<any[]>([]);
  const [userProfiles, setUserProfiles] = useState<
    Record<string, UserProfileResponse>
  >({});
  const fetchedProfiles = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const missingSenderIds = new Set<string>();
    messages.forEach((msg) => {
      if (
        msg.senderId !== auth.userId &&
        !fetchedProfiles.current.has(msg.senderId)
      ) {
        missingSenderIds.add(msg.senderId);
      }
    });

    if (missingSenderIds.size > 0) {
      missingSenderIds.forEach((id) => fetchedProfiles.current.add(id));

      const fetchProfiles = async () => {
        const newProfiles: Record<string, UserProfileResponse> = {};
        for (const id of missingSenderIds) {
          try {
            const profile = await getPublicProfile(id);
            newProfiles[id] = profile;
          } catch (error) {
            console.error("Failed to fetch user profile", error);
          }
        }
        setUserProfiles((prev) => ({ ...prev, ...newProfiles }));
      };
      fetchProfiles();
    }
  }, [messages, auth.userId]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (activeConversationId) {
        try {
          const history = await getConversationMessages(activeConversationId);
          setMessages(history);
        } catch (error) {
          console.error("Failed to fetch messages", error);
        }
      }
    };

    fetchHistory();
  }, [activeConversationId]);

  console.log(messages);

  useEffect(() => {
    if (auth.accessToken) {
      socketService.connect(auth.accessToken);
    }
    const socket = socketService.getSocket();

    if (socket && activeConversationId) {
      socket.emit(ChatEvent.JOIN_CONVERSATION, {
        conversationId: activeConversationId,
      });

      const handleNewMessage = (message: any) => {
        console.log("New message:", message);
        if (message.conversationId === activeConversationId) {
          setMessages((prev) => [...prev, message]);
        }
      };

      socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);

      return () => {
        socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
      };
    }
  }, [activeConversationId, auth.accessToken]);

  const handleSendMessage = (content: string) => {
    const socket = socketService.getSocket();
    if (socket && activeConversationId) {
      socket.emit(ChatEvent.SEND_MESSAGE, {
        conversationId: activeConversationId,
        content,
      });
    }
  };

  console.log(messages);

  return (
    <div className="flex-1 flex flex-col bg-white h-full min-h-0">
      {/* Header */}
      <ChatHeader
        memberProfile={memberProfile}
        onToggleRightPanel={onToggleRightPanel}
        onBack={onBack}
      />

      {/* Message List Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-200 space-y-1">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
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
                memberProfile={!isMe ? userProfiles[msg.senderId] : null}
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
