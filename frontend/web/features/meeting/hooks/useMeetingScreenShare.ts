"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useRoomContext,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
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

function getKnownMeetingRole(role?: string | null): MeetingParticipantRole | null {
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
    actorRole === MEETING_ROLE.COHOST &&
    activeRole === MEETING_ROLE.PARTICIPANT
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
  const intl = useAppIntl();
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
      displayName:
        participant.name ||
        participant.identity ||
        intl.formatMessage({ id: "app.user" }),
      role: getKnownMeetingRole(metadata.role),
    };
  }, [activeScreenShareTrack, activeScreenShareUserId, intl]);
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

  const startScreenShare = useCallback(async (interrupt = false) => {
    if (!currentUserId) return;

    if (!isModerator && !screenShareEnabled) {
      toast.error(
        intl.formatMessage({ id: "meeting.room.screenShare.disabled" }),
      );
      return;
    }

    setIsScreenSharePending(true);
    let shouldReleaseBackendState = false;
    try {
      const response = await startMeetingScreenShare(joinToken, { interrupt });
      shouldReleaseBackendState = true;
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
      if (shouldReleaseBackendState) {
        await stopMeetingScreenShare(joinToken).catch(() => undefined);
      }
      toast.error(
        intl.formatMessage({ id: "meeting.room.screenShare.startFailed" }),
      );
    } finally {
      setIsScreenSharePending(false);
    }
  }, [currentUserId, intl, isModerator, joinToken, room, screenShareEnabled]);

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

    if (
      activeScreenShareUserId &&
      activeScreenShareUserId !== currentUserId
    ) {
      if (!canInterruptActiveScreenShare) {
        const activeRole = activeScreenShareParticipant?.role;
        const messageId =
          activeRole === MEETING_ROLE.HOST
            ? "meeting.room.screenShare.hostIsSharing"
            : activeRole === MEETING_ROLE.COHOST
              ? "meeting.room.screenShare.cohostIsSharing"
              : "meeting.room.screenShare.alreadyActive";

        toast.error(intl.formatMessage({ id: messageId }));
        return;
      }

      void (async () => {
        const confirmed = await confirm({
          title: intl.formatMessage({
            id: "meeting.room.screenShare.replaceConfirmTitle",
          }),
          description: intl.formatMessage(
            { id: "meeting.room.screenShare.replaceConfirmDescription" },
            {
              name:
                activeScreenShareParticipant?.displayName ||
                intl.formatMessage({ id: "app.user" }),
            },
          ),
          confirmLabel: intl.formatMessage({
            id: "meeting.room.screenShare.replaceConfirmAction",
          }),
          cancelLabel: intl.formatMessage({ id: "app.cancel" }),
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
    intl,
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
