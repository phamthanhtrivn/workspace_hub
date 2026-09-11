"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { joinMeeting } from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import type {
  InstantMeetingResponse,
  MeetingJoinResponse,
  MeetingStatus,
  MeetingPreJoinSettings,
} from "../types/meeting.types";
import { saveMeetingDeviceSettings } from "../utils/meeting-device-storage";

interface UseJoinMeetingRoomOptions {
  onMeetingUnavailable?: (status: MeetingStatus) => void;
  onJoinError?: () => void;
}

interface JoinMeetingRoomInput {
  settings: MeetingPreJoinSettings;
  password?: string;
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
    mutationFn: ({ settings, password }: JoinMeetingRoomInput) =>
      joinMeeting(joinToken, {
        deviceSettings: {
          cameraEnabled: settings.cameraEnabled,
          microphoneEnabled: settings.microphoneEnabled,
          cameraDeviceId: settings.cameraDeviceId || undefined,
          microphoneDeviceId: settings.microphoneDeviceId || undefined,
        },
        password: password?.trim() || undefined,
      }),
    onSuccess: (response) => {
      if (isInstantMeetingResponse(response.data)) {
        queryClient.setQueryData(queryKey, response);
        return;
      }

      if (response.data.status === "ENDED" || response.data.status === "CANCELLED") {
        options.onMeetingUnavailable?.(response.data.status);
      }
    },
    onError: () => {
      options.onJoinError?.();
    },
  });

  const joinRoom = useCallback(
    (settings: MeetingPreJoinSettings, password?: string) => {
      if (!joinToken || isPending) return;

      saveMeetingDeviceSettings(settings);
      mutate({ settings, password });
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
