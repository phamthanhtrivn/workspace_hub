"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/store";
import { useMeetingLiveKitTokenQuery } from "../queries/use-meeting-queries";
import {
  getMeetingDevicePreferences,
  getSanitizedMeetingDevicePreferences,
} from "../../utils/meeting.utils";

interface UseMeetingRoomParams {
  meetingId?: string;
  joinToken: string;
  enabled: boolean;
}

export function useMeetingRoom({
  meetingId,
  joinToken,
  enabled,
}: UseMeetingRoomParams) {
  const { avatarUrl, email, fullName } = useAppSelector((state) => state.auth);
  const tokenQuery = useMeetingLiveKitTokenQuery(meetingId, enabled);
  const [devicePreferencesState, setDevicePreferencesState] = useState(() => ({
    isSanitized: false,
    joinToken,
    preferences: getMeetingDevicePreferences(joinToken),
  }));
  const displayName = fullName || email || "Meeting participant";
  const isPreparingDevicePreferences =
    !devicePreferencesState.isSanitized ||
    devicePreferencesState.joinToken !== joinToken;

  useEffect(() => {
    let cancelled = false;

    void getSanitizedMeetingDevicePreferences(joinToken).then((preferences) => {
      if (cancelled) return;
      setDevicePreferencesState({ isSanitized: true, joinToken, preferences });
    });

    return () => {
      cancelled = true;
    };
  }, [joinToken]);

  return {
    avatarUrl,
    devicePreferences: devicePreferencesState.preferences,
    displayName,
    isPreparingDevicePreferences,
    tokenQuery,
  };
}
