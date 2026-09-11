"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ApiResponse } from "@/features/chat/types/chat.types";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { getMeetingAccess, requestMeetingJoinApproval } from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import { MEETING_ROUTES, MEETING_STATUS } from "../types/meeting.constants";
import {
  MeetingJoinFlowStep,
  MeetingParticipantStatusValue,
} from "../types/meeting.types";
import type {
  InstantMeetingResponse,
  MeetingParticipantStatus,
  MeetingStatus,
} from "../types/meeting.types";
import type { MeetingJoinRequestUpdatedPayload } from "../types/meeting-socket.types";
import { useMeetingSocket } from "./useMeetingSocket";
import { useJoinMeetingRoom } from "./useJoinMeetingRoom";
import { usePreJoinMeetingDevices } from "./usePreJoinMeetingDevices";
import { useStartScheduledMeeting } from "./useScheduledMeetings";
import { needsMeetingPassword } from "../utils/meeting-room.utils";

export function useMeetingRoomJoinFlow(joinToken: string) {
  const intl = useAppIntl();
  const router = useRouter();
  const queryClient = useQueryClient();
  const handledUnavailableMeetingRef = useRef(false);
  const [waitingStatus, setWaitingStatus] =
    useState<MeetingParticipantStatus | null>(null);
  const [isPasswordStepOpen, setIsPasswordStepOpen] = useState(false);
  const [meetingPassword, setMeetingPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const handleMeetingUnavailable = useCallback((status: MeetingStatus) => {
    if (handledUnavailableMeetingRef.current) return;

    handledUnavailableMeetingRef.current = true;
    toast.info(
      intl.formatMessage({
        id:
          status === MEETING_STATUS.CANCELLED
            ? "meeting.room.cancelled"
            : "meeting.room.alreadyEnded",
      }),
    );
    queryClient.removeQueries({
      queryKey: meetingKeys.access(joinToken),
    });
    queryClient.removeQueries({
      queryKey: meetingKeys.room(joinToken),
    });
    router.replace(MEETING_ROUTES.DASHBOARD);
  }, [intl, joinToken, queryClient, router]);
  const cachedRoom = queryClient.getQueryData<ApiResponse<InstantMeetingResponse>>(
    meetingKeys.room(joinToken),
  );
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
  const startScheduledMeetingMutation = useStartScheduledMeeting(joinToken);
  const canJoinWithoutApproval = access?.canJoinWithoutApproval ?? access?.autoAdmit;
  const currentParticipantStatus =
    waitingStatus ?? access?.participantStatus ?? null;
  const shouldAskForPassword = needsMeetingPassword(access);
  const { joinRoom, room: joinedRoom, isJoining, isJoinError } =
    useJoinMeetingRoom(joinToken, {
      onMeetingUnavailable: handleMeetingUnavailable,
      onJoinError: () => {
        if (!shouldAskForPassword && !isPasswordStepOpen) return;

        setPasswordError(
          intl.formatMessage({ id: "meeting.password.incorrect" }),
        );
        setIsPasswordStepOpen(true);
      },
    });
  const room = cachedRoom?.data ?? joinedRoom;
  const requestApprovalMutation = useMutation({
    mutationFn: ({ password }: { password?: string } = {}) =>
      requestMeetingJoinApproval(joinToken, {
        password: password?.trim() || undefined,
      }),
    onSuccess: (response) => {
      if (
        response.data.meetingStatus === MEETING_STATUS.ENDED ||
        response.data.meetingStatus === MEETING_STATUS.CANCELLED
      ) {
        handleMeetingUnavailable(response.data.meetingStatus);
        return;
      }

      setWaitingStatus(
        response.data.participantStatus ??
          MeetingParticipantStatusValue.REQUESTED,
      );
      setIsPasswordStepOpen(false);
      setPasswordError(null);
    },
    onError: () => {
      if (!shouldAskForPassword && !isPasswordStepOpen) return;

      setPasswordError(
        intl.formatMessage({ id: "meeting.password.incorrect" }),
      );
      setIsPasswordStepOpen(true);
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
      access?.status !== "SCHEDULED" &&
      currentParticipantStatus !== MeetingParticipantStatusValue.REQUESTED &&
      currentParticipantStatus !== MeetingParticipantStatusValue.REJECTED,
  });

  useEffect(() => {
    if (
      access?.status === MEETING_STATUS.ENDED ||
      access?.status === MEETING_STATUS.CANCELLED
    ) {
      handleMeetingUnavailable(access.status);
    }
  }, [access?.status, handleMeetingUnavailable]);

  useMeetingSocket({
    meetingId,
    onMeetingStarted: useCallback(() => {
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.access(joinToken),
      });
    }, [joinToken, queryClient]),
    onReconnect: useCallback(() => {
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.access(joinToken),
      });
    }, [joinToken, queryClient]),
    onJoinRequestChanged: useCallback(
      (payload: MeetingJoinRequestUpdatedPayload) => {
        if (!meetingId || payload.meetingId !== meetingId) return;

        setWaitingStatus(payload.status);

        if (payload.status === MeetingParticipantStatusValue.APPROVED) {
          if (shouldAskForPassword && !meetingPassword) {
            setIsPasswordStepOpen(true);
            return;
          }

          joinRoom(preJoinDevices.settings, meetingPassword);
        }
      },
      [
        joinRoom,
        meetingId,
        meetingPassword,
        preJoinDevices.settings,
        shouldAskForPassword,
      ],
    ),
  });

  const flowStep = useMemo(() => {
    if (
      access?.status === MEETING_STATUS.ENDED ||
      access?.status === MEETING_STATUS.CANCELLED
    ) {
      return MeetingJoinFlowStep.CHECKING;
    }
    if (room) return MeetingJoinFlowStep.ROOM;
    if (isCheckingAccess) return MeetingJoinFlowStep.CHECKING;
    if (
      isJoining ||
      requestApprovalMutation.isPending ||
      startScheduledMeetingMutation.isPending
    ) {
      return MeetingJoinFlowStep.JOINING;
    }

    if (access?.status === "SCHEDULED") {
      return MeetingJoinFlowStep.WAITING_HOST;
    }

    if (isPasswordStepOpen) {
      return MeetingJoinFlowStep.PASSWORD;
    }

    if (
      currentParticipantStatus === MeetingParticipantStatusValue.REQUESTED ||
      currentParticipantStatus === MeetingParticipantStatusValue.REJECTED
    ) {
      return MeetingJoinFlowStep.WAITING_APPROVAL;
    }

    if (isAccessError || isJoinError) {
      return MeetingJoinFlowStep.ERROR;
    }

    return MeetingJoinFlowStep.PREJOIN;
  }, [
    currentParticipantStatus,
    isAccessError,
    isCheckingAccess,
    isJoinError,
    isJoining,
    isPasswordStepOpen,
    requestApprovalMutation.isPending,
    room,
    access?.status,
    startScheduledMeetingMutation.isPending,
  ]);
  const goBackToMeetings = useCallback(() => {
    router.push(MEETING_ROUTES.DASHBOARD);
  }, [router]);
  const joinMeeting = useCallback(() => {
    if (
      access?.status === MEETING_STATUS.ENDED ||
      access?.status === MEETING_STATUS.CANCELLED
    ) {
      handleMeetingUnavailable(access.status);
      return;
    }

    if (access?.status === MEETING_STATUS.SCHEDULED && access.canStart) {
      startScheduledMeetingMutation.mutate({
        deviceSettings: preJoinDevices.settings,
      });
      return;
    }

    if (shouldAskForPassword && !meetingPassword) {
      setPasswordError(null);
      setIsPasswordStepOpen(true);
      return;
    }

    if (canJoinWithoutApproval === false) {
      requestApprovalMutation.mutate({
        password: shouldAskForPassword ? meetingPassword : undefined,
      });
      return;
    }

    joinRoom(
      preJoinDevices.settings,
      shouldAskForPassword ? meetingPassword : undefined,
    );
  }, [
    canJoinWithoutApproval,
    access?.canStart,
    access?.status,
    handleMeetingUnavailable,
    joinRoom,
    meetingPassword,
    preJoinDevices.settings,
    requestApprovalMutation,
    shouldAskForPassword,
    startScheduledMeetingMutation,
  ]);
  const submitMeetingPassword = useCallback(
    (password: string) => {
      const normalizedPassword = password.trim();
      if (!normalizedPassword) {
        setPasswordError(
          intl.formatMessage({ id: "meeting.password.required" }),
        );
        return;
      }

      setMeetingPassword(normalizedPassword);
      setPasswordError(null);

      if (canJoinWithoutApproval === false) {
        requestApprovalMutation.mutate({ password: normalizedPassword });
        return;
      }

      joinRoom(preJoinDevices.settings, normalizedPassword);
    },
    [
      canJoinWithoutApproval,
      intl,
      joinRoom,
      preJoinDevices.settings,
      requestApprovalMutation,
    ],
  );

  return {
    flowStep,
    room,
    meetingId,
    access,
    isStartingScheduledMeeting: startScheduledMeetingMutation.isPending,
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
    passwordGateProps: {
      meetingTitle: access?.title ?? null,
      isSubmitting: isJoining || requestApprovalMutation.isPending,
      errorMessage: passwordError,
      onBack: goBackToMeetings,
      onSubmit: submitMeetingPassword,
    },
    goBackToMeetings,
  };
}
