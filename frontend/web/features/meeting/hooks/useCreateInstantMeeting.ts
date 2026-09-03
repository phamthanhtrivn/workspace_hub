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
  onCreating: () => void;
  onCreated: () => void;
  onError: () => void;
}

export function useCreateInstantMeeting({
  onCreating,
  onCreated,
  onError,
}: UseCreateInstantMeetingOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: (settings: MeetingPreJoinSettings) =>
      createInstantMeeting({
        autoAdmit: settings.autoAdmin,
        deviceSettings: {
          cameraEnabled: settings.cameraEnabled,
          microphoneEnabled: settings.microphoneEnabled,
          cameraDeviceId: settings.cameraDeviceId || undefined,
          microphoneDeviceId: settings.microphoneDeviceId || undefined,
        },
      }),
    onSuccess: (response) => {
      const joinToken = response.data.meeting.joinToken;
      queryClient.setQueryData(meetingKeys.room(joinToken), response);
      router.push(MEETING_ROUTES.room(joinToken));
      onCreated();
    },
    onError,
  });

  const createMeeting = useCallback(
    (settings: MeetingPreJoinSettings) => {
      if (isPending) return;

      saveMeetingDeviceSettings(settings);
      onCreating();
      mutate(settings);
    },
    [isPending, mutate, onCreating],
  );

  return {
    createMeeting,
    isCreating: isPending,
  };
}
