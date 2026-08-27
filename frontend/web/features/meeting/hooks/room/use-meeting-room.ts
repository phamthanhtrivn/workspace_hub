"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/store/store";
import { useMeetingLiveKitTokenQuery } from "../queries/use-meeting-queries";
import { getMeetingDevicePreferences } from "../../utils/meeting.utils";

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
  const devicePreferences = useMemo(
    () => getMeetingDevicePreferences(joinToken),
    [joinToken],
  );
  const displayName = fullName || email || "Meeting participant";
  const initials = buildInitials(fullName, email);

  return {
    avatarUrl,
    devicePreferences,
    displayName,
    initials,
    tokenQuery,
  };
}
