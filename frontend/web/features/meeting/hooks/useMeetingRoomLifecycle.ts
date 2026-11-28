"use client";

import { showMeetingActionError } from "../utils/meeting-action-errors";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import {
  useEndMeeting,
  useLeaveMeeting,
} from "./useMeetingParticipants";
import { useMeetingConfirmDialog } from "./useMeetingConfirmDialog";
import { useMeetingRealtimeCache } from "./useMeetingRealtimeCache";
import { useMeetingSocket } from "./useMeetingSocket";
import { MEETING_STATUS } from "../types/meeting.constants";
import { meetingKeys } from "../types/meeting.query-keys";
import type {
  MeetingEndedPayload,
  MeetingHostTransferredPayload,
  MeetingParticipantJoinedPayload,
  MeetingParticipantLeftPayload,
  MeetingParticipantRemovedPayload,
  MeetingParticipantUpdatedPayload,
  MeetingStatusUpdatedPayload,
} from "../types/meeting-socket.types";
import {
  MEETING_ROLE,
  type MeetingParticipantRole,
} from "../types/meeting.types";
import { getCurrentMeetingExitPath } from "../utils/meeting-room-navigation.utils";
import { openMeetingRoomRequests, closeMeetingRoomRequests } from "../api/meeting-room-requests";
import { clearMeetingRoomQueries as clearRoomQueries } from "../utils/meeting-room-queries";
import { MEETING_EXIT_LABELS, meetingExitToastId } from "../types/meeting-error.constants";

interface UseMeetingRoomLifecycleParams {
  meetingId: string;
  joinToken: string;
  participantRole: MeetingParticipantRole;
  initialAutoAdmit: boolean;
  initialChatEnabled: boolean;
}

export function useMeetingRoomLifecycle({
  meetingId,
  joinToken,
  participantRole,
  initialAutoAdmit,
  initialChatEnabled,
}: UseMeetingRoomLifecycleParams) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const authUser = useAppSelector((state) => state.auth);
  const room = useRoomContext();
  const exitingRef = useRef(false);
  useLayoutEffect(() => {
    exitingRef.current = false;
    return openMeetingRoomRequests(joinToken, meetingId);
  }, [joinToken, meetingId]);
  const [autoAdmit, setAutoAdmit] = useState(initialAutoAdmit);
  const [chatEnabled, setChatEnabled] = useState(initialChatEnabled);
  const [currentParticipantRole, setCurrentParticipantRole] =
    useState(participantRole);
  const leaveMeetingMutation = useLeaveMeeting(joinToken);
  const endMeetingMutation = useEndMeeting(joinToken);
  const { confirm, alertDialogProps } = useMeetingConfirmDialog();
  const {
    patchCurrentUserRole,
    patchParticipantInCachedPages,
    patchRoomSettings,
    removeParticipantFromCachedPages,
  } = useMeetingRealtimeCache(joinToken);

  const invalidateMeetingParticipants = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: meetingKeys.participantsRoot(joinToken),
    });
  }, [joinToken, queryClient]);

  const invalidateMeetingIdentityState = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: meetingKeys.access(joinToken),
    });
    queryClient.invalidateQueries({
      queryKey: meetingKeys.room(joinToken),
    });
  }, [joinToken, queryClient]);

  const invalidateMeetingRoomState = useCallback(() => {
    invalidateMeetingParticipants();
    invalidateMeetingIdentityState();
  }, [invalidateMeetingIdentityState, invalidateMeetingParticipants]);

  const clearMeetingRoomQueries = useCallback(() => {
    exitingRef.current = true;
    closeMeetingRoomRequests(joinToken);
    clearRoomQueries(queryClient, joinToken, authUser.userId);
  }, [joinToken, queryClient, authUser.userId]);

  const leaveRoom = useCallback(() => {
    room.disconnect();
    router.replace(getCurrentMeetingExitPath());
  }, [room, router]);

  const handleStatusUpdated = useCallback(
    (payload: MeetingStatusUpdatedPayload) => {
      if (payload.meetingId !== meetingId) return;

      setAutoAdmit(payload.autoAdmit);
      setChatEnabled(payload.chatEnabled);
      patchRoomSettings({
        autoAdmit: payload.autoAdmit,
        chatEnabled: payload.chatEnabled,
        screenShareEnabled: payload.screenShareEnabled,
        activeScreenShareUserId: payload.activeScreenShareUserId,
        screenShareStartedAt: payload.screenShareStartedAt,
      });
      if (payload.status === MEETING_STATUS.ENDED) return;

      invalidateMeetingIdentityState();
    },
    [invalidateMeetingIdentityState, meetingId, patchRoomSettings],
  );

  const handleMeetingEnded = useCallback(
    (payload: MeetingEndedPayload) => {
      if (payload.meetingId !== meetingId || exitingRef.current) return;

      if (payload.endedBy !== authUser.userId) {
        toast.info(MEETING_EXIT_LABELS.hostEnded, { id: meetingExitToastId(joinToken) });
      } else toast.success(MEETING_EXIT_LABELS.ended, { id: meetingExitToastId(joinToken) });

      clearMeetingRoomQueries();
      leaveRoom();
    },
    [
      authUser.userId,
      clearMeetingRoomQueries,
      leaveRoom,
      meetingId,
      joinToken,
    ],
  );

  const handleParticipantJoined = useCallback(
    (payload: MeetingParticipantJoinedPayload) => {
      if (payload.meetingId !== meetingId) return;

      invalidateMeetingParticipants();
    },
    [invalidateMeetingParticipants, meetingId],
  );

  const handleParticipantLeft = useCallback(
    (payload: MeetingParticipantLeftPayload) => {
      if (payload.meetingId !== meetingId || exitingRef.current) return;

      if (payload.userId === authUser.userId) {
        clearMeetingRoomQueries();
        leaveRoom();
        return;
      }

      removeParticipantFromCachedPages(payload.userId);
      invalidateMeetingRoomState();
    },
    [
      authUser.userId,
      clearMeetingRoomQueries,
      invalidateMeetingRoomState,
      leaveRoom,
      meetingId,
      removeParticipantFromCachedPages,
    ],
  );

  const handleParticipantUpdated = useCallback(
    (payload: MeetingParticipantUpdatedPayload) => {
      if (payload.meetingId !== meetingId) return;

      patchParticipantInCachedPages(payload);

      if (payload.userId === authUser.userId) {
        setCurrentParticipantRole(payload.role);
        patchCurrentUserRole(payload.role);
      }

      invalidateMeetingRoomState();
    },
    [
      authUser.userId,
      invalidateMeetingRoomState,
      meetingId,
      patchCurrentUserRole,
      patchParticipantInCachedPages,
    ],
  );

  const handleParticipantRemoved = useCallback(
    (payload: MeetingParticipantRemovedPayload) => {
      if (payload.meetingId !== meetingId || exitingRef.current) return;

      if (payload.userId === authUser.userId) {
        toast.info(MEETING_EXIT_LABELS.removed, { id: meetingExitToastId(joinToken) });
        clearMeetingRoomQueries();
        leaveRoom();
        return;
      }

      removeParticipantFromCachedPages(payload.userId);
      invalidateMeetingRoomState();
    },
    [
      authUser.userId,
      clearMeetingRoomQueries,
      invalidateMeetingRoomState,
      leaveRoom,
      meetingId,
      removeParticipantFromCachedPages,
      joinToken,
    ],
  );

  const handleHostTransferred = useCallback(
    (payload: MeetingHostTransferredPayload) => {
      if (payload.meetingId !== meetingId) return;

      if (payload.targetUserId === authUser.userId) {
        setCurrentParticipantRole(MEETING_ROLE.HOST);
        patchCurrentUserRole(MEETING_ROLE.HOST);
        toast.success("You are now the host");
      }

      if (payload.previousHostId === authUser.userId) {
        setCurrentParticipantRole(MEETING_ROLE.PARTICIPANT);
        patchCurrentUserRole(MEETING_ROLE.PARTICIPANT);
      }

      invalidateMeetingRoomState();
    },
    [
      authUser.userId,
      invalidateMeetingRoomState,
      meetingId,
      patchCurrentUserRole,
    ],
  );

  useMeetingSocket({
    meetingId,
    onStatusUpdated: handleStatusUpdated,
    onMeetingEnded: handleMeetingEnded,
    onParticipantJoined: handleParticipantJoined,
    onParticipantLeft: handleParticipantLeft,
    onParticipantUpdated: handleParticipantUpdated,
    onParticipantRemoved: handleParticipantRemoved,
    onHostTransferred: handleHostTransferred,
  });

  const handleLeave = useCallback(() => {
    leaveMeetingMutation.mutate(undefined, {
      onSuccess: () => {
        if (exitingRef.current) return;
        clearMeetingRoomQueries();
        leaveRoom();
      },
      onError: (permissionFailure) => {
        if (exitingRef.current) return;
        showMeetingActionError(permissionFailure, "Could not save leave action");
      },
    });
  }, [clearMeetingRoomQueries, leaveMeetingMutation, leaveRoom]);

  const handleEndForEveryone = useCallback(async () => {
    const confirmed = await confirm({
      title: "End this meeting for everyone?",
      confirmLabel: "End",
      cancelLabel: "Cancel",
      variant: "danger",
    });

    if (!confirmed || exitingRef.current) return;

    endMeetingMutation.mutate(undefined, {
      onSuccess: () => {
        if (exitingRef.current) return;
        toast.success(MEETING_EXIT_LABELS.ended, { id: meetingExitToastId(joinToken) });
        clearMeetingRoomQueries();
        leaveRoom();
      },
    });
  }, [clearMeetingRoomQueries, confirm, endMeetingMutation, leaveRoom, joinToken]);

  return {
    autoAdmit,
    setAutoAdmit,
    chatEnabled,
    setChatEnabled,
    currentParticipantRole,
    handleLeave,
    handleEndForEveryone,
    alertDialogProps,
    isLeavePending: leaveMeetingMutation.isPending,
    isEndPending: endMeetingMutation.isPending,
  };
}
