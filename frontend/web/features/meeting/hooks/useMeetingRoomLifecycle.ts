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
import { useMeetingSocket } from "./useMeetingSocket";
import { MEETING_ROUTES } from "../types/meeting.constants";
import { meetingKeys } from "../types/meeting.query-keys";
import type {
  MeetingEndedPayload,
  MeetingHostTransferredPayload,
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

  const invalidateMeetingRoomState = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: meetingKeys.participantsRoot(joinToken),
    });
    queryClient.invalidateQueries({
      queryKey: meetingKeys.access(joinToken),
    });
    queryClient.invalidateQueries({
      queryKey: meetingKeys.room(joinToken),
    });
  }, [joinToken, queryClient]);

  const leaveRoom = useCallback(() => {
    room.disconnect();
    router.push(MEETING_ROUTES.DASHBOARD);
  }, [room, router]);

  const handleStatusUpdated = useCallback(
    (payload: MeetingStatusUpdatedPayload) => {
      if (payload.meetingId === meetingId) {
        setAutoAdmit(payload.autoAdmit);
      }
    },
    [meetingId],
  );

  const handleMeetingEnded = useCallback(
    (payload: MeetingEndedPayload) => {
      if (payload.meetingId !== meetingId) return;

      if (payload.endedBy !== authUser.userId) {
        toast.info(intl.formatMessage({ id: "meeting.room.endedByHost" }));
      }

      invalidateMeetingRoomState();
      leaveRoom();
    },
    [
      authUser.userId,
      intl,
      invalidateMeetingRoomState,
      leaveRoom,
      meetingId,
    ],
  );

  const handleParticipantUpdated = useCallback(
    (payload: MeetingParticipantUpdatedPayload) => {
      if (payload.meetingId !== meetingId) return;

      if (payload.userId === authUser.userId) {
        setCurrentParticipantRole(payload.role);
      }

      invalidateMeetingRoomState();
    },
    [authUser.userId, invalidateMeetingRoomState, meetingId],
  );

  const handleParticipantRemoved = useCallback(
    (payload: MeetingParticipantRemovedPayload) => {
      if (payload.meetingId !== meetingId) return;

      invalidateMeetingRoomState();

      if (payload.userId === authUser.userId) {
        toast.info(intl.formatMessage({ id: "meeting.room.removedByHost" }));
        leaveRoom();
      }
    },
    [
      authUser.userId,
      intl,
      invalidateMeetingRoomState,
      leaveRoom,
      meetingId,
    ],
  );

  const handleHostTransferred = useCallback(
    (payload: MeetingHostTransferredPayload) => {
      if (payload.meetingId !== meetingId) return;

      if (payload.targetUserId === authUser.userId) {
        setCurrentParticipantRole(MEETING_ROLE.HOST);
        toast.success(intl.formatMessage({ id: "meeting.room.youAreHost" }));
      }

      if (payload.previousHostId === authUser.userId) {
        setCurrentParticipantRole(MEETING_ROLE.PARTICIPANT);
      }

      invalidateMeetingRoomState();
    },
    [authUser.userId, intl, invalidateMeetingRoomState, meetingId],
  );

  useMeetingSocket({
    meetingId,
    onStatusUpdated: handleStatusUpdated,
    onMeetingEnded: handleMeetingEnded,
    onParticipantUpdated: handleParticipantUpdated,
    onParticipantRemoved: handleParticipantRemoved,
    onHostTransferred: handleHostTransferred,
  });

  const handleLeave = useCallback(() => {
    leaveMeetingMutation.mutate(undefined, {
      onSuccess: () => {
        invalidateMeetingRoomState();
        leaveRoom();
      },
      onError: () => {
        toast.error(intl.formatMessage({ id: "meeting.room.leaveFailed" }));
      },
    });
  }, [intl, invalidateMeetingRoomState, leaveMeetingMutation, leaveRoom]);

  const handleEndForEveryone = useCallback(() => {
    const confirmed = window.confirm(
      intl.formatMessage({ id: "meeting.room.endConfirm" }),
    );

    if (!confirmed) return;

    endMeetingMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(intl.formatMessage({ id: "meeting.room.endSuccess" }));
        invalidateMeetingRoomState();
        leaveRoom();
      },
    });
  }, [endMeetingMutation, intl, invalidateMeetingRoomState, leaveRoom]);

  return {
    autoAdmit,
    setAutoAdmit,
    currentParticipantRole,
    handleLeave,
    handleEndForEveryone,
    isLeavePending: leaveMeetingMutation.isPending,
    isEndPending: endMeetingMutation.isPending,
  };
}
