"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { joinMeeting } from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import type { MeetingPreJoinSettings } from "../types/meeting.types";
import { saveMeetingDeviceSettings } from "../utils/meeting-device-storage";

export function useJoinMeetingRoom(joinToken: string) {
  const queryClient = useQueryClient();
  const queryKey = meetingKeys.room(joinToken);

  const {
    data,
    isError,
    isPending,
    mutate,
  } = useMutation({
    mutationFn: (settings: MeetingPreJoinSettings) =>
      joinMeeting(joinToken, {
        deviceSettings: {
          cameraEnabled: settings.cameraEnabled,
          microphoneEnabled: settings.microphoneEnabled,
          cameraDeviceId: settings.cameraDeviceId || undefined,
          microphoneDeviceId: settings.microphoneDeviceId || undefined,
        },
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKey, response);
    },
  });

  const joinRoom = useCallback(
    (settings: MeetingPreJoinSettings) => {
      if (!joinToken || isPending) return;

      saveMeetingDeviceSettings(settings);
      mutate(settings);
    },
    [isPending, joinToken, mutate],
  );

  return {
    joinRoom,
    isJoining: isPending,
    isJoinError: isError,
    room: data?.data,
  };
}
