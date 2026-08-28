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

function buildInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "ME";

  const [firstPart, secondPart] = source.split(/[\s@.]+/).filter(Boolean);
  return `${firstPart?.[0] ?? ""}${secondPart?.[0] ?? ""}`.toUpperCase();
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
  const initials = buildInitials(fullName, email);
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
    initials,
    isPreparingDevicePreferences,
    tokenQuery,
  };
}
