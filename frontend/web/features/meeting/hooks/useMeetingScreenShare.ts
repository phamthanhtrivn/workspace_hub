"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, Track, type LocalTrackPublication } from "livekit-client";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAppSelector } from "@/store/store";
import {
  startMeetingScreenShare,
  stopMeetingScreenShare,
} from "../api/meeting.api";
import type {
  MeetingScreenShareStartedPayload,
  MeetingScreenShareStoppedPayload,
  MeetingStatusUpdatedPayload,
} from "../types/meeting-socket.types";
import { MEETING_ROLE, type MeetingParticipantRole } from "../types/meeting.types";
import { useMeetingSocket } from "./useMeetingSocket";

interface UseMeetingScreenShareParams {
  meetingId: string;
  joinToken: string;
  participantRole: MeetingParticipantRole;
  initialScreenShareEnabled: boolean;
  initialActiveScreenShareUserId: string | null;
  initialScreenShareStartedAt: string | null;
}

function isScreenSharePublication(publication: LocalTrackPublication) {
  return (
    publication.source === Track.Source.ScreenShare ||
    publication.source === Track.Source.ScreenShareAudio
  );
}

export function useMeetingScreenShare({
  meetingId,
  joinToken,
  participantRole,
  initialScreenShareEnabled,
  initialActiveScreenShareUserId,
  initialScreenShareStartedAt,
}: UseMeetingScreenShareParams) {
  const intl = useAppIntl();
  const room = useRoomContext();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const [screenShareEnabled, setScreenShareEnabled] = useState(
    initialScreenShareEnabled,
  );
  const [activeScreenShareUserId, setActiveScreenShareUserId] = useState<
    string | null
  >(initialActiveScreenShareUserId);
  const [screenShareStartedAt, setScreenShareStartedAt] = useState<
    string | null
  >(initialScreenShareStartedAt);
  const [isScreenSharePending, setIsScreenSharePending] = useState(false);
  const isStoppingRef = useRef(false);
  const activeScreenShareUserIdRef = useRef(activeScreenShareUserId);
  const isLocalSharing =
    Boolean(currentUserId) && activeScreenShareUserId === currentUserId;
  const isModerator =
    participantRole === MEETING_ROLE.HOST ||
    participantRole === MEETING_ROLE.COHOST;
  const canStartScreenShare =
    isLocalSharing ||
    isModerator ||
    (screenShareEnabled && !activeScreenShareUserId);

  useEffect(() => {
    activeScreenShareUserIdRef.current = activeScreenShareUserId;
  }, [activeScreenShareUserId]);

  const stopLocalScreenShare = useCallback(async () => {
    if (!room.localParticipant.isScreenShareEnabled) return;

    isStoppingRef.current = true;
    try {
      await room.localParticipant.setScreenShareEnabled(false);
    } finally {
      isStoppingRef.current = false;
    }
  }, [room]);

  const handleScreenShareStarted = useCallback(
    (payload: MeetingScreenShareStartedPayload) => {
      if (payload.meetingId !== meetingId) return;

      setScreenShareEnabled(payload.screenShareEnabled);
      setActiveScreenShareUserId(payload.activeScreenShareUserId);
      setScreenShareStartedAt(payload.screenShareStartedAt);
    },
    [meetingId],
  );

  const handleScreenShareStopped = useCallback(
    (payload: MeetingScreenShareStoppedPayload) => {
      if (payload.meetingId !== meetingId) return;

      setScreenShareEnabled(payload.screenShareEnabled);
      setActiveScreenShareUserId(null);
      setScreenShareStartedAt(null);

      if (payload.userId === currentUserId) {
        void stopLocalScreenShare();

        if (payload.stoppedBy && payload.stoppedBy !== currentUserId) {
          toast.info(
            intl.formatMessage({ id: "meeting.room.screenShare.stoppedByHost" }),
          );
        }
      }
    },
    [currentUserId, intl, meetingId, stopLocalScreenShare],
  );

  const handleStatusUpdated = useCallback(
    (payload: MeetingStatusUpdatedPayload) => {
      if (payload.meetingId !== meetingId) return;

      setScreenShareEnabled(payload.screenShareEnabled);
      setActiveScreenShareUserId(payload.activeScreenShareUserId);
      setScreenShareStartedAt(payload.screenShareStartedAt);
    },
    [meetingId],
  );

  useMeetingSocket({
    meetingId,
    onStatusUpdated: handleStatusUpdated,
    onScreenShareStarted: handleScreenShareStarted,
    onScreenShareStopped: handleScreenShareStopped,
  });

  useEffect(() => {
    const handleLocalTrackUnpublished = (
      publication: LocalTrackPublication,
    ) => {
      if (!currentUserId) return;
      if (!isScreenSharePublication(publication)) return;
      if (isStoppingRef.current) return;
      if (activeScreenShareUserIdRef.current !== currentUserId) return;

      activeScreenShareUserIdRef.current = null;
      setActiveScreenShareUserId(null);
      setScreenShareStartedAt(null);
      void stopMeetingScreenShare(joinToken).catch(() => undefined);
    };

    room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

    return () => {
      room.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
    };
  }, [currentUserId, joinToken, room]);

  const startScreenShare = useCallback(async () => {
    if (!currentUserId) return;

    if (!canStartScreenShare) {
      toast.error(
        intl.formatMessage({ id: "meeting.room.screenShare.disabled" }),
      );
      return;
    }

    setIsScreenSharePending(true);
    try {
      const response = await startMeetingScreenShare(joinToken);
      setScreenShareEnabled(response.data.screenShareEnabled);
      setActiveScreenShareUserId(response.data.activeScreenShareUserId);
      setScreenShareStartedAt(response.data.screenShareStartedAt);

      await room.localParticipant.setScreenShareEnabled(true, {
        audio: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "include",
        systemAudio: "include",
      });
    } catch {
      await stopMeetingScreenShare(joinToken).catch(() => undefined);
      toast.error(
        intl.formatMessage({ id: "meeting.room.screenShare.startFailed" }),
      );
    } finally {
      setIsScreenSharePending(false);
    }
  }, [canStartScreenShare, currentUserId, intl, joinToken, room]);

  const stopScreenShare = useCallback(async () => {
    setIsScreenSharePending(true);
    try {
      await stopLocalScreenShare();
      const response = await stopMeetingScreenShare(joinToken);
      setScreenShareEnabled(response.data.screenShareEnabled);
      setActiveScreenShareUserId(null);
      setScreenShareStartedAt(null);
    } catch {
      toast.error(
        intl.formatMessage({ id: "meeting.room.screenShare.stopFailed" }),
      );
    } finally {
      setIsScreenSharePending(false);
    }
  }, [intl, joinToken, stopLocalScreenShare]);

  const toggleScreenShare = useCallback(() => {
    if (isLocalSharing) {
      void stopScreenShare();
      return;
    }

    void startScreenShare();
  }, [isLocalSharing, startScreenShare, stopScreenShare]);

  return {
    screenShareEnabled,
    setScreenShareEnabled,
    activeScreenShareUserId,
    screenShareStartedAt,
    isLocalSharing,
    isScreenSharePending,
    canStartScreenShare,
    toggleScreenShare,
  };
}
