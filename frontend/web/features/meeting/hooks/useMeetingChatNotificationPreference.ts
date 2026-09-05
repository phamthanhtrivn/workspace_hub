"use client";

import { useCallback, useState } from "react";
import { useAppSelector } from "@/store/store";
import type { MeetingChatNotificationPreferenceUpdatedPayload } from "../types/meeting-socket.types";
import { useUpdateMeetingChatNotificationPreference } from "./useMeetingMessages";
import { useMeetingSocket } from "./useMeetingSocket";

interface UseMeetingChatNotificationPreferenceParams {
  meetingId: string;
  joinToken: string;
  initialChatMuted: boolean;
}

interface ChatNotificationPreferenceState {
  joinToken: string;
  chatMuted: boolean;
}

export function useMeetingChatNotificationPreference({
  meetingId,
  joinToken,
  initialChatMuted,
}: UseMeetingChatNotificationPreferenceParams) {
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const [preference, setPreference] =
    useState<ChatNotificationPreferenceState>({
      joinToken,
      chatMuted: initialChatMuted,
    });
  const {
    isPending: isChatNotificationPreferencePending,
    mutate: updateChatNotificationPreference,
  } = useUpdateMeetingChatNotificationPreference(joinToken);

  const chatMuted =
    preference.joinToken === joinToken
      ? preference.chatMuted
      : initialChatMuted;

  const setChatMuted = useCallback(
    (muted: boolean) => {
      const previousMuted = chatMuted;

      setPreference({
        joinToken,
        chatMuted: muted,
      });
      updateChatNotificationPreference(muted, {
        onSuccess: (response) => {
          setPreference({
            joinToken,
            chatMuted: response.data.chatMuted,
          });
        },
        onError: () => {
          setPreference((current) => {
            if (current.joinToken !== joinToken) return current;
            if (current.chatMuted !== muted) return current;

            return {
              joinToken,
              chatMuted: previousMuted,
            };
          });
        },
      });
    },
    [chatMuted, joinToken, updateChatNotificationPreference],
  );

  const syncChatMutedFromSocket = useCallback(
    (payload: MeetingChatNotificationPreferenceUpdatedPayload) => {
      if (payload.meetingId !== meetingId) return;
      if (payload.userId !== currentUserId) return;

      setPreference({
        joinToken,
        chatMuted: payload.chatMuted,
      });
    },
    [currentUserId, joinToken, meetingId],
  );

  useMeetingSocket({
    meetingId,
    onChatNotificationPreferenceUpdated: syncChatMutedFromSocket,
  });

  return {
    chatMuted,
    isChatNotificationPreferencePending,
    setChatMuted,
  };
}
