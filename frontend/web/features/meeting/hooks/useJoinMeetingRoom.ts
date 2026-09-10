"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { joinMeeting } from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import type {
  InstantMeetingResponse,
  MeetingJoinResponse,
  MeetingPreJoinSettings,
} from "../types/meeting.types";
import { saveMeetingDeviceSettings } from "../utils/meeting-device-storage";

interface UseJoinMeetingRoomOptions {
  onMeetingAlreadyEnded?: () => void;
}

export function useJoinMeetingRoom(
  joinToken: string,
  options: UseJoinMeetingRoomOptions = {},
) {
  const queryClient = useQueryClient();
  const queryKey = meetingKeys.room(joinToken);
  const isInstantMeetingResponse = (
    response: MeetingJoinResponse,
  ): response is InstantMeetingResponse =>
    "meeting" in response && "livekit" in response;

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
      if (isInstantMeetingResponse(response.data)) {
        queryClient.setQueryData(queryKey, response);
        return;
      }

      if (response.data.status === "ENDED") {
        options.onMeetingAlreadyEnded?.();
      }
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
    room:
      data?.data && isInstantMeetingResponse(data.data) ? data.data : undefined,
  };
}
