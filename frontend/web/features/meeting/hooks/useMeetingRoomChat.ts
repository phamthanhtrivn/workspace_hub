"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import type { MeetingMessageInputRef } from "../components/room/message/meeting-message-input";
import { getMeetingParticipants } from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import type { MeetingMessageReadPayload } from "../types/meeting-socket.types";
import type {
  MeetingMessageMediaPayload,
  MeetingMessageResponse,
  MeetingParticipantProfile,
} from "../types/meeting.types";
import { upsertMeetingMessage } from "../utils/meeting-message.utils";
import { useMeetingMessageActions } from "./useMeetingMessageActions";
import { useMeetingMessageScroll } from "./useMeetingMessageScroll";
import { useMeetingMessageSocket } from "./useMeetingMessageSocket";
import { useMeetingMessages } from "./useMeetingMessages";

interface UseMeetingRoomChatParams {
  joinToken: string;
  meetingId: string;
}

export function useMeetingRoomChat({
  joinToken,
  meetingId,
}: UseMeetingRoomChatParams) {
  const authUser = useAppSelector((state) => state.auth);
  const [editingMessage, setEditingMessage] =
    useState<MeetingMessageResponse | null>(null);
  const [realtimeReadReceipts, setRealtimeReadReceipts] = useState<
    Record<string, string>
  >({});
  const messageInputRef = useRef<MeetingMessageInputRef>(null);
  const hasScrolledInitialMessages = useRef(false);
  const {
    messages,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    loadOlderRef,
    setRealtimeMessages,
  } = useMeetingMessages(joinToken);
  const { containerRef, bottomRef, isNearBottom, scrollToBottom } =
    useMeetingMessageScroll();

  const participantsQuery = useQuery({
    queryKey: meetingKeys.participants(joinToken, "", 1),
    queryFn: () =>
      getMeetingParticipants({
        joinToken,
        search: "",
        page: 1,
        limit: 50,
      }),
    enabled: Boolean(joinToken),
  });

  const profilesByUserId = useMemo(() => {
    const profiles: Record<string, MeetingParticipantProfile> = {};

    participantsQuery.data?.data.items.forEach((participant) => {
      if (participant.profile) {
        profiles[participant.userId] = participant.profile;
      }
    });
    messages.forEach((message) => {
      if (message.senderProfile) {
        profiles[message.senderId] = message.senderProfile;
      }
    });

    return profiles;
  }, [messages, participantsQuery.data?.data.items]);

  const participantReadReceipts = useMemo(() => {
    const participantReceipts: Record<string, string> = {};
    participantsQuery.data?.data.items.forEach((participant) => {
      if (participant.lastReadMessageId) {
        participantReceipts[participant.userId] = participant.lastReadMessageId;
      }
    });

    return participantReceipts;
  }, [participantsQuery.data?.data.items]);

  const readReceipts = useMemo(
    () => ({
      ...participantReadReceipts,
      ...realtimeReadReceipts,
    }),
    [participantReadReceipts, realtimeReadReceipts],
  );

  useEffect(() => {
    hasScrolledInitialMessages.current = false;
  }, [joinToken]);

  useEffect(() => {
    if (
      isLoading ||
      messages.length === 0 ||
      hasScrolledInitialMessages.current
    ) {
      return;
    }

    hasScrolledInitialMessages.current = true;
    setTimeout(() => scrollToBottom("auto"), 0);
  }, [isLoading, messages.length, scrollToBottom]);

  const appendRealtimeMessage = useCallback(
    (message: MeetingMessageResponse) => {
      const shouldScroll =
        isNearBottom() || message.senderId === authUser.userId;

      setRealtimeMessages((current) => upsertMeetingMessage(current, message));
      setRealtimeReadReceipts((current) => ({
        ...current,
        [message.senderId]: message.id,
      }));

      if (shouldScroll) {
        setTimeout(() => scrollToBottom(), 80);
      }
    },
    [authUser.userId, isNearBottom, scrollToBottom, setRealtimeMessages],
  );

  const handleReadReceipt = useCallback((payload: MeetingMessageReadPayload) => {
    setRealtimeReadReceipts((current) => ({
      ...current,
      [payload.userId]: payload.messageId,
    }));
  }, []);

  useMeetingMessageSocket({
    meetingId,
    onMessage: appendRealtimeMessage,
    onRead: handleReadReceipt,
  });

  const { sendMessage, editMessage, recallMessage, reactToMessage, markAsRead } =
    useMeetingMessageActions({
      joinToken,
      appendMessage: appendRealtimeMessage,
    });

  const handleSubmit = useCallback(
    async (content: string, medias?: MeetingMessageMediaPayload[]) => {
      if (editingMessage) {
        const edited = await editMessage(editingMessage.id, content);
        if (edited) {
          setEditingMessage(null);
          messageInputRef.current?.reset();
          return true;
        }
        return false;
      }

      const sent = await sendMessage(content, medias);
      return Boolean(sent);
    },
    [editMessage, editingMessage, sendMessage],
  );

  const handleMarkAsRead = useCallback(
    (messageId: string) => {
      if (!authUser.userId) return;

      setRealtimeReadReceipts((current) => ({
        ...current,
        [authUser.userId!]: messageId,
      }));
      void markAsRead(messageId);
    },
    [authUser.userId, markAsRead],
  );

  const handleRecallMessage = useCallback(
    (messageId: string) => {
      void recallMessage(messageId);
    },
    [recallMessage],
  );

  const handleStartEdit = useCallback((message: MeetingMessageResponse) => {
    setEditingMessage(message);
    setTimeout(() => {
      messageInputRef.current?.setMessage(message.content ?? "");
      messageInputRef.current?.focus();
    }, 50);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    messageInputRef.current?.reset();
  }, []);

  return {
    bottomRef,
    containerRef,
    currentUserId: authUser.userId,
    editingMessage,
    handleCancelEdit,
    handleMarkAsRead,
    handleRecallMessage,
    handleStartEdit,
    handleSubmit,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    loadOlderRef,
    messageInputRef,
    messages,
    profilesByUserId,
    reactToMessage,
    readReceipts,
  };
}
