"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { ChatEvent } from "@/features/chat/api/chat.events";
import { socketService } from "@/features/chat/api/chat-socket.service";
import { ChatQueryKey } from "@/features/chat/types/chat.constant";
import { useFlashingDocumentTitle } from "../hooks/useFlashingDocumentTitle";
import { playNotificationSound } from "../utils/notification-alert.utils";

export default function ChatMessageAlertManager() {
  const { accessToken, userId: currentUserId } = useAppSelector(
    (state) => state.auth,
  );
  const activeConversationId = useAppSelector(
    (state) => state.chat.activeConversation?.id,
  );
  const spaceChannelsBySpaceId = useAppSelector(
    (state) => state.chat.spaceChannels.bySpaceId,
  );
  const activeConversationIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const titleAlert = useFlashingDocumentTitle("You have new chat messages!");

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId || null;
    if (activeConversationId) {
      titleAlert.reset();
    }
  }, [activeConversationId, titleAlert]);

  useEffect(() => {
    if (!accessToken || !currentUserId) return;

    const socket =
      socketService.getSocket() || socketService.connect(accessToken);

    const handleNewMessage = (message: any) => {
      const messageConversationId = message.conversationId ?? message.channelId;

      if (!messageConversationId || message.senderId === currentUserId) return;
      if (messageConversationId === activeConversationIdRef.current) return;

      const cachedDirectData: any = queryClient.getQueryData([
        ChatQueryKey.DIRECT_CONVERSATIONS,
        currentUserId,
      ]);
      const cachedLegacyData: any = queryClient.getQueryData([
        "conversations",
        currentUserId,
      ]);
      const conversations =
        cachedDirectData?.conversations ||
        cachedDirectData?.data ||
        cachedLegacyData?.conversations ||
        cachedLegacyData?.data ||
        [];
      const channels = Object.values(spaceChannelsBySpaceId).flat();
      const conversation =
        conversations.find((item: any) => item.id === messageConversationId) ||
        channels.find((item: any) => item.id === messageConversationId);
      const currentMember = conversation?.members?.find(
        (member: any) => member.userId === currentUserId,
      );
      const isMuted = currentMember?.muted || false;
      const isMentioned =
        message.mentions?.includes(currentUserId) ||
        message.mentions?.includes("all");

      if (!isMuted || isMentioned) {
        playNotificationSound();
        titleAlert.increment();
      }
    };

    socket.on(ChatEvent.NEW_MESSAGE, handleNewMessage);
    return () => {
      socket.off(ChatEvent.NEW_MESSAGE, handleNewMessage);
    };
  }, [
    accessToken,
    currentUserId,
    queryClient,
    spaceChannelsBySpaceId,
    titleAlert,
  ]);

  return null;
}
