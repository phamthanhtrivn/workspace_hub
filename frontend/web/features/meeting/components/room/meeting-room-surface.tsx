"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { MediaDeviceFailure } from "livekit-client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const {
    avatarUrl,
    devicePreferences,
    displayName,
    initials,
    isPreparingDevicePreferences,
    tokenQuery,
  } = useMeetingRoom({
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

  const handleDeviceError = (error: Error) => {
    setMediaError(resolveDeviceErrorMessage(error, intl.formatMessage));
  };

  const handleRoomError = (error: Error) => {
    if (isMediaDeviceError(error)) {
      handleDeviceError(error);
      return;
    }

    console.error("Meeting room connection failed", error);
    setMediaError(intl.formatMessage({ id: "meeting.room.connectionError" }));
  };

  const handleMediaDeviceFailure = (
    failure?: MediaDeviceFailure,
    kind?: MediaDeviceKind,
  ) => {
    setMediaError(
      resolveMediaDeviceFailureMessage(failure, kind, intl.formatMessage),
    );
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setPortalTarget(document.body);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  if (tokenQuery.isLoading || isPreparingDevicePreferences) {
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

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <section className="fixed inset-0 z-50 bg-[#111827]">
      <LiveKitRoom
        token={liveKitToken.token}
        serverUrl={liveKitToken.serverUrl}
        connect
        audio={audioCapture}
        video={videoCapture}
        onConnected={() => setMediaError(null)}
        onMediaDeviceFailure={handleMediaDeviceFailure}
        onError={handleRoomError}
        data-lk-theme="default"
        className="h-screen w-screen bg-[#111827]"
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
          onDeviceError={handleDeviceError}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </section>,
    portalTarget,
  );
}

function resolveDeviceErrorMessage(
  error: Error,
  formatMessage: (descriptor: { id: string }) => string,
) {
  if (error.name === "OverconstrainedError") {
    return formatMessage({ id: "meeting.room.deviceInvalid" });
  }

  const failure = MediaDeviceFailure.getFailure(error);
  return resolveMediaDeviceFailureMessage(failure, undefined, formatMessage);
}

function isMediaDeviceError(error: Error) {
  return (
    error.name === "OverconstrainedError" ||
    MediaDeviceFailure.getFailure(error) !== undefined
  );
}

function resolveMediaDeviceFailureMessage(
  failure: MediaDeviceFailure | undefined,
  kind: MediaDeviceKind | undefined,
  formatMessage: (descriptor: { id: string }) => string,
) {
  switch (failure) {
    case MediaDeviceFailure.PermissionDenied:
      return formatMessage({ id: "meeting.room.devicePermissionDenied" });
    case MediaDeviceFailure.NotFound:
      return formatMessage({ id: "meeting.room.deviceNotFound" });
    case MediaDeviceFailure.DeviceInUse:
      return formatMessage({ id: "meeting.room.deviceInUse" });
    default:
      return formatMessage({
        id:
          kind === "audioinput" || kind === "videoinput"
            ? "meeting.room.deviceError"
            : "meeting.room.deviceError",
      });
  }
}
