"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInstantMeeting } from "../api/meeting.api";
import type { MeetingPreJoinSettings } from "../types/meeting.types";
import { MEETING_ROUTES } from "../types/meeting.constants";
import { meetingKeys } from "../types/meeting.query-keys";
import { saveMeetingDeviceSettings } from "../utils/meeting-device-storage";

interface UseCreateInstantMeetingOptions {
  onCreating?: () => void;
  onCreated?: () => void;
  onError?: (error: unknown) => void;
}

export interface CreateInstantMeetingSettings extends Partial<MeetingPreJoinSettings> {
  channelId?: string;
  conversationId?: string;
  title?: string;
}

export function useCreateInstantMeeting(options?: UseCreateInstantMeetingOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: (settings: CreateInstantMeetingSettings) =>
      createInstantMeeting({
        autoAdmit: settings.autoAdmin ?? true,
        chatEnabled: settings.chatEnabled ?? true,
        title: settings.title,
        channelId: settings.channelId,
        conversationId: settings.conversationId,
        deviceSettings: {
          cameraEnabled: settings.cameraEnabled ?? true,
          microphoneEnabled: settings.microphoneEnabled ?? true,
          cameraDeviceId: settings.cameraDeviceId || undefined,
          microphoneDeviceId: settings.microphoneDeviceId || undefined,
        },
      }),
    onSuccess: (response) => {
      const joinToken = response.data.meeting.joinToken;
      queryClient.setQueryData(meetingKeys.room(joinToken), response);
      router.push(MEETING_ROUTES.room(joinToken));
      options?.onCreated?.();
    },
    onError: (err) => {
      options?.onError?.(err);
    },
  });

  const createMeeting = useCallback(
    (settings: CreateInstantMeetingSettings) => {
      if (isPending) return;

      if (
        settings.cameraEnabled !== undefined ||
        settings.microphoneEnabled !== undefined
      ) {
        saveMeetingDeviceSettings({
          cameraEnabled: settings.cameraEnabled ?? true,
          microphoneEnabled: settings.microphoneEnabled ?? true,
          cameraDeviceId: settings.cameraDeviceId ?? "",
          microphoneDeviceId: settings.microphoneDeviceId ?? "",
          autoAdmin: settings.autoAdmin ?? true,
          chatEnabled: settings.chatEnabled ?? true,
        });
      }
      options?.onCreating?.();
      mutate(settings);
    },
    [isPending, mutate, options],
  );

  return {
    createMeeting,
    isCreating: isPending,
  };
}
