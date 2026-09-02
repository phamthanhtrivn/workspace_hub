"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/features/chat/types/chat.types";
import { joinMeeting } from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import type { InstantMeetingResponse } from "../types/meeting.types";
import { loadMeetingDeviceSettings } from "../utils/meeting-device-storage";

export function useJoinMeetingRoom(joinToken: string) {
  const queryClient = useQueryClient();
  const settings = useMemo(() => loadMeetingDeviceSettings(), []);
  const queryKey = meetingKeys.room(joinToken);
  const cachedRoom = queryClient.getQueryData<ApiResponse<InstantMeetingResponse>>(
    queryKey,
  );

  const query = useQuery({
    queryKey,
    queryFn: () =>
      joinMeeting(joinToken, {
        deviceSettings: {
          cameraEnabled: settings.cameraEnabled,
          microphoneEnabled: settings.microphoneEnabled,
          cameraDeviceId: settings.cameraDeviceId || undefined,
          microphoneDeviceId: settings.microphoneDeviceId || undefined,
        },
      }),
    enabled: Boolean(joinToken) && !cachedRoom,
    initialData: cachedRoom,
    retry: false,
  });

  return {
    ...query,
    settings,
    room: query.data?.data,
  };
}
