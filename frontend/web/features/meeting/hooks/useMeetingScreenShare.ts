"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useRoomContext,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import {
  RoomEvent,
  Track,
  type LocalTrack,
  type LocalTrackPublication,
} from "livekit-client";
import { isAxiosError } from "axios";
import { toast } from "sonner";
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
import {
  MEETING_ROLE,
  type MeetingParticipantRole,
} from "../types/meeting.types";
import { parseParticipantMetadata } from "../utils/meeting-room.utils";
import { useMeetingConfirmDialog } from "./useMeetingConfirmDialog";
import { useMeetingSocket } from "./useMeetingSocket";

interface UseMeetingScreenShareParams {
  meetingId: string;
  joinToken: string;
  participantRole: MeetingParticipantRole;
  initialScreenShareEnabled: boolean;
  initialActiveScreenShareUserId: string | null;
  initialScreenShareStartedAt: string | null;
  activeScreenShareTrack: TrackReferenceOrPlaceholder | null;
}

function isScreenSharePublication(publication: LocalTrackPublication) {
  return (
    publication.source === Track.Source.ScreenShare ||
    publication.source === Track.Source.ScreenShareAudio
  );
}

function getKnownMeetingRole(
  role?: string | null,
): MeetingParticipantRole | null {
  if (role === MEETING_ROLE.HOST) return MEETING_ROLE.HOST;
  if (role === MEETING_ROLE.COHOST) return MEETING_ROLE.COHOST;
  if (role === MEETING_ROLE.PARTICIPANT) return MEETING_ROLE.PARTICIPANT;

  return null;
}

function canInterruptScreenShare({
  actorRole,
  activeRole,
}: {
  actorRole: MeetingParticipantRole;
  activeRole: MeetingParticipantRole | null;
}) {
  if (actorRole === MEETING_ROLE.HOST) {
    return activeRole !== MEETING_ROLE.HOST;
  }

  return (
    actorRole === MEETING_ROLE.COHOST && activeRole === MEETING_ROLE.PARTICIPANT
  );
}

export function useMeetingScreenShare({
  meetingId,
  joinToken,
  participantRole,
  initialScreenShareEnabled,
  initialActiveScreenShareUserId,
  initialScreenShareStartedAt,
  activeScreenShareTrack,
}: UseMeetingScreenShareParams) {
  const room = useRoomContext();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const { confirm, alertDialogProps } = useMeetingConfirmDialog();
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
  const activeScreenShareParticipant = useMemo(() => {
    if (!activeScreenShareTrack) return null;
    if (
      activeScreenShareTrack.participant.identity !== activeScreenShareUserId
    ) {
      return null;
    }

    const participant = activeScreenShareTrack.participant;
    const metadata = parseParticipantMetadata(participant);

    return {
      userId: participant.identity,
      displayName: participant.name || participant.identity || "User",
      role: getKnownMeetingRole(metadata.role),
    };
  }, [activeScreenShareTrack, activeScreenShareUserId]);
  const canInterruptActiveScreenShare =
    Boolean(activeScreenShareUserId) &&
    activeScreenShareUserId !== currentUserId &&
    canInterruptScreenShare({
      actorRole: participantRole,
      activeRole: activeScreenShareParticipant?.role ?? null,
    });
  const canStartScreenShare =
    isLocalSharing ||
    isModerator ||
    Boolean(activeScreenShareUserId) ||
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
          toast.info("The host stopped your screen share");
        }
      }
    },
    [currentUserId, meetingId, stopLocalScreenShare],
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

  const startScreenShare = useCallback(
    async (interrupt = false) => {
      if (!currentUserId) return;

      if (!isModerator && !screenShareEnabled) {
        toast.error("Screen sharing is disabled");
        return;
      }

      setIsScreenSharePending(true);
      let shouldReleaseBackendState = false;
      let captureCompleted = false;
      let tracks: LocalTrack[] = [];
      let stage: "capture" | "authorize" | "publish" = "capture";
      try {
        // Open the picker while the browser still has the click's user activation.
        tracks = await room.localParticipant.createScreenTracks({
          audio: true,
          selfBrowserSurface: "include",
          surfaceSwitching: "include",
          systemAudio: "include",
        });
        captureCompleted = true;
        if (
          tracks.some((track) => track.mediaStreamTrack.readyState === "ended")
        ) {
          throw new DOMException("Screen capture ended", "AbortError");
        }
        stage = "authorize";
        const response = await startMeetingScreenShare(joinToken, {
          interrupt,
        });
        shouldReleaseBackendState = true;
        setScreenShareEnabled(response.data.screenShareEnabled);
        setActiveScreenShareUserId(response.data.activeScreenShareUserId);
        setScreenShareStartedAt(response.data.screenShareStartedAt);

        if (
          tracks.some((track) => track.mediaStreamTrack.readyState === "ended")
        ) {
          throw new DOMException("Screen capture ended", "AbortError");
        }
        stage = "publish";
        for (const track of tracks) {
          await room.localParticipant.publishTrack(track);
        }
      } catch (error) {
        isStoppingRef.current = true;
        try {
          for (const track of tracks) {
            await room.localParticipant
              .unpublishTrack(track)
              .catch(() => undefined);
            track.stop();
          }
        } finally {
          isStoppingRef.current = false;
        }
        if (shouldReleaseBackendState) {
          await stopMeetingScreenShare(joinToken).catch(() => undefined);
          activeScreenShareUserIdRef.current = null;
          setActiveScreenShareUserId(null);
          setScreenShareStartedAt(null);
        }
        if (!captureCompleted && error instanceof Error) {
          if (error.name === "NotAllowedError" || error.name === "AbortError") {
            toast.info(
              "Screen sharing was cancelled or permission was denied. Choose a screen, window or tab to share.",
            );
            return;
          }
          if (error.name === "InvalidStateError") {
            toast.error("Focus this meeting tab and click Share screen again.");
            return;
          }
          if (error.name === "NotReadableError") {
            toast.error(
              "The browser could not capture that screen. Try another window or check your system's screen recording permissions.",
            );
            return;
          }
          if (
            error.name === "DeviceUnsupportedError" ||
            error.name === "NotSupportedError" ||
            error.name === "NotFoundError"
          ) {
            toast.error(
              "Screen sharing is unavailable in this browser. Use a supported desktop browser on HTTPS or localhost.",
            );
            return;
          }
        }
        console.error("Screen sharing failed", {
          stage,
          name: error instanceof Error ? error.name : undefined,
          message: error instanceof Error ? error.message : undefined,
          error,
        });
        toast.error(
          isAxiosError(error) &&
            typeof error.response?.data?.message === "string"
            ? error.response.data.message
            : "Could not start screen sharing. Please try again.",
        );
      } finally {
        setIsScreenSharePending(false);
      }
    },
    [currentUserId, isModerator, joinToken, room, screenShareEnabled],
  );

  const stopScreenShare = useCallback(async () => {
    setIsScreenSharePending(true);
    try {
      await stopLocalScreenShare();
      const response = await stopMeetingScreenShare(joinToken);
      setScreenShareEnabled(response.data.screenShareEnabled);
      setActiveScreenShareUserId(null);
      setScreenShareStartedAt(null);
    } catch {
      toast.error("Could not stop screen sharing");
    } finally {
      setIsScreenSharePending(false);
    }
  }, [joinToken, stopLocalScreenShare]);

  const toggleScreenShare = useCallback(() => {
    if (isLocalSharing) {
      void stopScreenShare();
      return;
    }

    if (activeScreenShareUserId && activeScreenShareUserId !== currentUserId) {
      if (!canInterruptActiveScreenShare) {
        const activeRole = activeScreenShareParticipant?.role;
        const message =
          activeRole === MEETING_ROLE.HOST
            ? "The host is sharing their screen"
            : activeRole === MEETING_ROLE.COHOST
              ? "A co-host is sharing their screen"
              : "Someone is already sharing their screen";

        toast.error(message);
        return;
      }

      void (async () => {
        const confirmed = await confirm({
          title: "Replace current screen share?",
          description: `${activeScreenShareParticipant?.displayName || "User"} is already sharing. Your screen share will replace theirs.`,
          confirmLabel: "Share instead",
          cancelLabel: "Cancel",
          variant: "warning",
        });

        if (confirmed) {
          await startScreenShare(true);
        }
      })();
      return;
    }

    void startScreenShare(false);
  }, [
    activeScreenShareParticipant,
    activeScreenShareUserId,
    canInterruptActiveScreenShare,
    confirm,
    currentUserId,
    isLocalSharing,
    startScreenShare,
    stopScreenShare,
  ]);

  return {
    screenShareEnabled,
    setScreenShareEnabled,
    activeScreenShareUserId,
    screenShareStartedAt,
    isLocalSharing,
    isScreenSharePending,
    canStartScreenShare,
    toggleScreenShare,
    alertDialogProps,
  };
}
