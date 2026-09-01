"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { joinMeeting } from "../api/meeting.api";
import { loadMeetingDeviceSettings } from "../utils/meeting-device-storage";

export function useJoinMeetingRoom(joinToken: string) {
  const settings = useMemo(() => loadMeetingDeviceSettings(), []);

  const query = useQuery({
    queryKey: ["meeting-room", joinToken],
    queryFn: () =>
      joinMeeting(joinToken, {
        deviceSettings: {
          cameraEnabled: settings.cameraEnabled,
          microphoneEnabled: settings.microphoneEnabled,
          cameraDeviceId: settings.cameraDeviceId || undefined,
          microphoneDeviceId: settings.microphoneDeviceId || undefined,
        },
      }),
    enabled: Boolean(joinToken),
    retry: false,
  });

  return {
    ...query,
    settings,
    room: query.data?.data,
  };
}
