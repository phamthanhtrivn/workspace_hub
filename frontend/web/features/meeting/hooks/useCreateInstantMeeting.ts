"use client";

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { createInstantMeeting } from "../api/meeting.api";
import type { MeetingPreJoinSettings } from "../types/meeting.types";
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
      const roomUrl = `${window.location.origin}/meetings/${response.data.meeting.joinToken}`;
      const roomWindow = window.open(roomUrl, "_blank", "noopener,noreferrer");

      if (!roomWindow) {
        window.location.assign(roomUrl);
        return;
      }

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
