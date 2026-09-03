"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/features/chat/types/chat.types";
import { getMeetingAccess } from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import { MEETING_ROUTES } from "../types/meeting.constants";
import { MeetingJoinFlowStep } from "../types/meeting.types";
import type { InstantMeetingResponse } from "../types/meeting.types";
import { useJoinMeetingRoom } from "./useJoinMeetingRoom";
import { usePreJoinMeetingDevices } from "./usePreJoinMeetingDevices";

export function useMeetingRoomJoinFlow(joinToken: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
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
  const canJoinWithoutApproval = accessResponse?.data.autoAdmit;
  const flowStep = useMemo(() => {
    if (room) return MeetingJoinFlowStep.ROOM;
    if (isCheckingAccess) return MeetingJoinFlowStep.CHECKING;
    if (isJoining) return MeetingJoinFlowStep.JOINING;

    if (
      isAccessError ||
      isJoinError ||
      canJoinWithoutApproval === false
    ) {
      return MeetingJoinFlowStep.ERROR;
    }

    return MeetingJoinFlowStep.PREJOIN;
  }, [
    canJoinWithoutApproval,
    isAccessError,
    isCheckingAccess,
    isJoinError,
    isJoining,
    room,
  ]);
  const preJoinDevices = usePreJoinMeetingDevices({
    previewEnabled: flowStep === MeetingJoinFlowStep.PREJOIN,
  });
  const goBackToMeetings = useCallback(() => {
    router.push(MEETING_ROUTES.DASHBOARD);
  }, [router]);
  const joinMeeting = useCallback(() => {
    joinRoom(preJoinDevices.settings);
  }, [joinRoom, preJoinDevices.settings]);

  return {
    flowStep,
    room,
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
