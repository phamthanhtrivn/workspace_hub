"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useMeetingRoom } from "../../hooks/room/use-meeting-room";
import { MeetingResponse } from "../../types/meeting.types";
import { MeetingRoomContent } from "./meeting-room-content";
import { buildParticipantInitials } from "./meeting-room.utils";

interface MeetingRoomSurfaceProps {
  meeting: MeetingResponse;
  joinToken: string;
}

export function MeetingRoomSurface({
  meeting,
  joinToken,
}: MeetingRoomSurfaceProps) {
  const intl = useAppIntl();
  const [mediaError, setMediaError] = useState<string | null>(null);
  const { avatarUrl, devicePreferences, displayName, initials, tokenQuery } =
    useMeetingRoom({
      meetingId: meeting.id,
      joinToken,
      enabled: true,
    });
  const liveKitToken = tokenQuery.data?.data;
  const isHost =
    meeting.currentParticipant?.role === "HOST" ||
    meeting.hostId === meeting.currentParticipant?.userId;
  const audioCapture = devicePreferences.isMicEnabled
    ? devicePreferences.micDeviceId
      ? { deviceId: devicePreferences.micDeviceId }
      : true
    : false;
  const videoCapture = devicePreferences.isCameraEnabled
    ? devicePreferences.cameraDeviceId
      ? { deviceId: devicePreferences.cameraDeviceId }
      : true
    : false;
  const currentProfile = meeting.currentParticipant?.profile;
  const resolvedDisplayName =
    currentProfile?.fullName || currentProfile?.email || displayName;
  const resolvedAvatarUrl = currentProfile?.avatarUrl || avatarUrl;
  const resolvedInitials = currentProfile
    ? buildParticipantInitials(resolvedDisplayName)
    : initials;

  const handleMediaDeviceError = () => {
    setMediaError(intl.formatMessage({ id: "meeting.room.deviceError" }));
  };

  if (tokenQuery.isLoading) {
    return (
      <section className="grid min-h-[520px] place-items-center rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          {intl.formatMessage({ id: "meeting.room.connecting" })}
        </div>
      </section>
    );
  }

  if (!liveKitToken) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm font-bold text-red-700">
        {intl.formatMessage({ id: "meeting.room.tokenFailed" })}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-800 bg-[#111827] shadow-sm">
      <LiveKitRoom
        token={liveKitToken.token}
        serverUrl={liveKitToken.serverUrl}
        connect
        audio={audioCapture}
        video={videoCapture}
        onConnected={() => setMediaError(null)}
        onMediaDeviceFailure={handleMediaDeviceError}
        onError={handleMediaDeviceError}
        data-lk-theme="default"
        className="min-h-[calc(100vh-160px)] bg-[#111827]"
      >
        <MeetingRoomContent
          avatarUrl={resolvedAvatarUrl}
          displayName={resolvedDisplayName}
          initials={resolvedInitials}
          isHost={isHost}
          meeting={meeting}
          mediaError={mediaError}
          audioCaptureOptions={audioCapture === true ? undefined : audioCapture || undefined}
          videoCaptureOptions={videoCapture === true ? undefined : videoCapture || undefined}
          onDeviceError={handleMediaDeviceError}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </section>
  );
}
