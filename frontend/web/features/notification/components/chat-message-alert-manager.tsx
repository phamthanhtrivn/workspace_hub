"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { ChatEvent } from "@/features/chat/api/chat.events";
import { socketService } from "@/infrastructure/realtime/communication-socket.client";
import { ChatQueryKey, ChatQueryRoot } from "@/features/chat/types/chat.constant";
import {
  ChatMessageResponse,
  ConversationResponse,
} from "@/features/chat/types/chat.types";
import { useNotificationAlertPreference } from "@/features/user-setting/hooks/useNotificationAlertPreference";
import { useFlashingDocumentTitle } from "../hooks/useFlashingDocumentTitle";
import { playNotificationSound } from "../utils/notification-alert.utils";

type DirectMessagesCache = {
  directMessages?: ConversationResponse[];
  data?: ConversationResponse[];
};

type ChannelsCache = {
  channels?: ConversationResponse[];
};

export default function ChatMessageAlertManager() {
  const { accessToken, userId: currentUserId } = useAppSelector(
    (state) => state.auth,
  );
  const activeConversationId = useAppSelector(
    (state) => state.chat.activeChatId,
  );
  const activeConversationIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const titleAlert = useFlashingDocumentTitle("You have new chat messages!");
  const shouldRunNotificationAlert = useNotificationAlertPreference();

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

    const handleNewMessage = (message: ChatMessageResponse) => {
      const messageConversationId = message.conversationId ?? message.channelId;

      if (!messageConversationId || message.senderId === currentUserId) return;
      if (messageConversationId === activeConversationIdRef.current) return;

      const cachedDirectData = queryClient.getQueryData<DirectMessagesCache>([
        ChatQueryKey.DIRECT_MESSAGES,
        currentUserId,
      ]);
      const conversations =
        cachedDirectData?.directMessages || cachedDirectData?.data || [];
      const channels = queryClient
        .getQueriesData<ChannelsCache>({ queryKey: [ChatQueryRoot.CHANNELS] })
        .flatMap(([, data]) => data?.channels ?? []);
      const conversation =
        conversations.find((item) => item.id === messageConversationId) ||
        channels.find((item) => item.id === messageConversationId);
      const currentMember = conversation?.members?.find(
        (member) => member.userId === currentUserId,
      );
      const isMuted = currentMember?.muted || false;
      const isMentioned =
        message.mentions?.includes(currentUserId) ||
        message.mentions?.includes("all");

      if (shouldRunNotificationAlert && (!isMuted || isMentioned)) {
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
    shouldRunNotificationAlert,
    titleAlert,
  ]);

  return null;
}
