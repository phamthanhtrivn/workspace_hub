"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/features/chat/types/chat.types";
import { getMeetingAccess, requestMeetingJoinApproval } from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import { MEETING_ROUTES } from "../types/meeting.constants";
import {
  MeetingJoinFlowStep,
  MeetingParticipantStatusValue,
} from "../types/meeting.types";
import type {
  InstantMeetingResponse,
  MeetingParticipantStatus,
} from "../types/meeting.types";
import type { MeetingJoinRequestUpdatedPayload } from "../types/meeting-socket.types";
import { useMeetingSocket } from "./useMeetingSocket";
import { useJoinMeetingRoom } from "./useJoinMeetingRoom";
import { usePreJoinMeetingDevices } from "./usePreJoinMeetingDevices";

export function useMeetingRoomJoinFlow(joinToken: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [waitingStatus, setWaitingStatus] =
    useState<MeetingParticipantStatus | null>(null);
  const cachedRoom = queryClient.getQueryData<ApiResponse<InstantMeetingResponse>>(
    meetingKeys.room(joinToken),
  );
  const { joinRoom, room: joinedRoom, isJoining, isJoinError } =
    useJoinMeetingRoom(joinToken);
  const room = cachedRoom?.data ?? joinedRoom;
  const {
    data: accessResponse,
    isLoading: isCheckingAccess,
    isError: isAccessError,
  } = useQuery({
    queryKey: meetingKeys.access(joinToken),
    queryFn: () => getMeetingAccess(joinToken),
    enabled: Boolean(joinToken) && !cachedRoom,
    retry: false,
  });
  const access = accessResponse?.data;
  const canJoinWithoutApproval = access?.canJoinWithoutApproval ?? access?.autoAdmit;
  const currentParticipantStatus =
    waitingStatus ?? access?.participantStatus ?? null;
  const requestApprovalMutation = useMutation({
    mutationFn: () => requestMeetingJoinApproval(joinToken),
    onSuccess: (response) => {
      setWaitingStatus(
        response.data.participantStatus ??
          MeetingParticipantStatusValue.REQUESTED,
      );
    },
  });
  const meetingId = access?.meetingId ?? room?.meeting.id ?? null;
  const preJoinDevices = usePreJoinMeetingDevices({
    previewEnabled:
      !room &&
      !isCheckingAccess &&
      !isJoining &&
      !requestApprovalMutation.isPending &&
      !isAccessError &&
      !isJoinError &&
      currentParticipantStatus !== MeetingParticipantStatusValue.REQUESTED &&
      currentParticipantStatus !== MeetingParticipantStatusValue.REJECTED,
  });

  useMeetingSocket({
    meetingId: null,
    onJoinRequestChanged: useCallback(
      (payload: MeetingJoinRequestUpdatedPayload) => {
        if (!meetingId || payload.meetingId !== meetingId) return;

        setWaitingStatus(payload.status);

        if (payload.status === MeetingParticipantStatusValue.APPROVED) {
          joinRoom(preJoinDevices.settings);
        }
      },
      [joinRoom, meetingId, preJoinDevices.settings],
    ),
  });

  const flowStep = useMemo(() => {
    if (room) return MeetingJoinFlowStep.ROOM;
    if (isCheckingAccess) return MeetingJoinFlowStep.CHECKING;
    if (isJoining || requestApprovalMutation.isPending) {
      return MeetingJoinFlowStep.JOINING;
    }

    if (
      isAccessError ||
      isJoinError
    ) {
      return MeetingJoinFlowStep.ERROR;
    }

    if (
      currentParticipantStatus === MeetingParticipantStatusValue.REQUESTED ||
      currentParticipantStatus === MeetingParticipantStatusValue.REJECTED
    ) {
      return MeetingJoinFlowStep.WAITING_APPROVAL;
    }

    return MeetingJoinFlowStep.PREJOIN;
  }, [
    currentParticipantStatus,
    isAccessError,
    isCheckingAccess,
    isJoinError,
    isJoining,
    requestApprovalMutation.isPending,
    room,
  ]);
  const goBackToMeetings = useCallback(() => {
    router.push(MEETING_ROUTES.DASHBOARD);
  }, [router]);
  const joinMeeting = useCallback(() => {
    if (canJoinWithoutApproval === false) {
      requestApprovalMutation.mutate();
      return;
    }

    joinRoom(preJoinDevices.settings);
  }, [
    canJoinWithoutApproval,
    joinRoom,
    preJoinDevices.settings,
    requestApprovalMutation,
  ]);

  return {
    flowStep,
    room,
    meetingId,
    waitingStatus: waitingStatus ?? access?.participantStatus ?? null,
    settings: preJoinDevices.settings,
    preJoinProps: {
      settings: preJoinDevices.settings,
      onSettingsChange: preJoinDevices.setSettings,
      cameras: preJoinDevices.cameras,
      microphones: preJoinDevices.microphones,
      previewStream: preJoinDevices.previewStream,
      isPreviewLoading: preJoinDevices.isPreviewLoading,
      permissionError: preJoinDevices.permissionError,
      stopPreview: preJoinDevices.stopPreview,
      onCancel: goBackToMeetings,
      onStart: joinMeeting,
    },
    goBackToMeetings,
  };
}
