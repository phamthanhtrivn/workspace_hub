"use client";

import { useCallback, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAppSelector } from "@/store/store";
import {
  useEndMeeting,
  useLeaveMeeting,
} from "./useMeetingParticipants";
import { useMeetingConfirmDialog } from "./useMeetingConfirmDialog";
import { useMeetingRealtimeCache } from "./useMeetingRealtimeCache";
import { useMeetingSocket } from "./useMeetingSocket";
import { MEETING_ROUTES } from "../types/meeting.constants";
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

interface UseMeetingRoomLifecycleParams {
  meetingId: string;
  joinToken: string;
  participantRole: MeetingParticipantRole;
  initialAutoAdmit: boolean;
}

export function useMeetingRoomLifecycle({
  meetingId,
  joinToken,
  participantRole,
  initialAutoAdmit,
}: UseMeetingRoomLifecycleParams) {
  const intl = useAppIntl();
  const router = useRouter();
  const queryClient = useQueryClient();
  const authUser = useAppSelector((state) => state.auth);
  const room = useRoomContext();
  const [autoAdmit, setAutoAdmit] = useState(initialAutoAdmit);
  const [currentParticipantRole, setCurrentParticipantRole] =
    useState(participantRole);
  const leaveMeetingMutation = useLeaveMeeting(joinToken);
  const endMeetingMutation = useEndMeeting(joinToken);
  const { confirm, alertDialogProps } = useMeetingConfirmDialog();
  const {
    patchCurrentUserRole,
    patchParticipantInCachedPages,
    patchRoomAutoAdmit,
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
    void queryClient.cancelQueries({
      queryKey: meetingKeys.participantsRoot(joinToken),
    });
    void queryClient.cancelQueries({
      queryKey: meetingKeys.access(joinToken),
    });
    void queryClient.cancelQueries({
      queryKey: meetingKeys.room(joinToken),
    });
    queryClient.removeQueries({
      queryKey: meetingKeys.participantsRoot(joinToken),
    });
    queryClient.removeQueries({
      queryKey: meetingKeys.access(joinToken),
    });
    queryClient.removeQueries({
      queryKey: meetingKeys.room(joinToken),
    });
  }, [joinToken, queryClient]);

  const leaveRoom = useCallback(() => {
    room.disconnect();
    router.push(MEETING_ROUTES.DASHBOARD);
  }, [room, router]);

  const handleStatusUpdated = useCallback(
    (payload: MeetingStatusUpdatedPayload) => {
      if (payload.meetingId !== meetingId) return;

      setAutoAdmit(payload.autoAdmit);
      patchRoomAutoAdmit(payload.autoAdmit);
      if (payload.status === "ENDED") return;

      invalidateMeetingIdentityState();
    },
    [invalidateMeetingIdentityState, meetingId, patchRoomAutoAdmit],
  );

  const handleMeetingEnded = useCallback(
    (payload: MeetingEndedPayload) => {
      if (payload.meetingId !== meetingId) return;

      if (payload.endedBy !== authUser.userId) {
        toast.info(intl.formatMessage({ id: "meeting.room.endedByHost" }));
      }

      clearMeetingRoomQueries();
      leaveRoom();
    },
    [
      authUser.userId,
      clearMeetingRoomQueries,
      intl,
      leaveRoom,
      meetingId,
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
      if (payload.meetingId !== meetingId) return;

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
      if (payload.meetingId !== meetingId) return;

      if (payload.userId === authUser.userId) {
        toast.info(intl.formatMessage({ id: "meeting.room.removedByHost" }));
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
      intl,
      invalidateMeetingRoomState,
      leaveRoom,
      meetingId,
      removeParticipantFromCachedPages,
    ],
  );

  const handleHostTransferred = useCallback(
    (payload: MeetingHostTransferredPayload) => {
      if (payload.meetingId !== meetingId) return;

      if (payload.targetUserId === authUser.userId) {
        setCurrentParticipantRole(MEETING_ROLE.HOST);
        patchCurrentUserRole(MEETING_ROLE.HOST);
        toast.success(intl.formatMessage({ id: "meeting.room.youAreHost" }));
      }

      if (payload.previousHostId === authUser.userId) {
        setCurrentParticipantRole(MEETING_ROLE.PARTICIPANT);
        patchCurrentUserRole(MEETING_ROLE.PARTICIPANT);
      }

      invalidateMeetingRoomState();
    },
    [
      authUser.userId,
      intl,
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
        clearMeetingRoomQueries();
        leaveRoom();
      },
      onError: () => {
        toast.error(intl.formatMessage({ id: "meeting.room.leaveFailed" }));
      },
    });
  }, [clearMeetingRoomQueries, intl, leaveMeetingMutation, leaveRoom]);

  const handleEndForEveryone = useCallback(async () => {
    const confirmed = await confirm({
      title: intl.formatMessage({ id: "meeting.room.endConfirm" }),
      confirmLabel: intl.formatMessage({ id: "meeting.room.control.end" }),
      cancelLabel: intl.formatMessage({ id: "app.cancel" }),
      variant: "danger",
    });

    if (!confirmed) return;

    endMeetingMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(intl.formatMessage({ id: "meeting.room.endSuccess" }));
        clearMeetingRoomQueries();
        leaveRoom();
      },
    });
  }, [clearMeetingRoomQueries, confirm, endMeetingMutation, intl, leaveRoom]);

  return {
    autoAdmit,
    setAutoAdmit,
    currentParticipantRole,
    handleLeave,
    handleEndForEveryone,
    alertDialogProps,
    isLeavePending: leaveMeetingMutation.isPending,
    isEndPending: endMeetingMutation.isPending,
  };
}
