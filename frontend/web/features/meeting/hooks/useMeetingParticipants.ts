"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  endMeeting,
  getMeetingParticipants,
  leaveMeeting,
  removeMeetingParticipant,
  stopParticipantScreenShare as stopParticipantScreenShareApi,
  updateMeetingParticipantHandState,
  updateMeetingParticipantRole,
} from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import type { MeetingParticipantRole } from "../types/meeting.types";

const participantPageSize = 8;

export function useMeetingParticipants({
  joinToken,
  search,
  page,
  enabled,
}: {
  joinToken: string;
  search: string;
  page: number;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: meetingKeys.participants(joinToken, search, page),
    queryFn: () =>
      getMeetingParticipants({
        joinToken,
        search,
        page,
        limit: participantPageSize,
      }),
    enabled: enabled && Boolean(joinToken),
  });
}

export function useMeetingParticipantActions(joinToken: string) {
  const queryClient = useQueryClient();
  const invalidateParticipants = () => {
    queryClient.invalidateQueries({
      queryKey: meetingKeys.participantsRoot(joinToken),
    });
    queryClient.invalidateQueries({
      queryKey: meetingKeys.access(joinToken),
    });
    queryClient.invalidateQueries({
      queryKey: meetingKeys.room(joinToken),
    });
  };

  const removeParticipant = useMutation({
    mutationFn: (userId: string) => removeMeetingParticipant(joinToken, userId),
    onSuccess: () => {
      invalidateParticipants();
      toast.success("Participant removed from the meeting");
    },
    onError: () => {
      toast.error("Could not remove participant");
    },
  });

  const updateRole = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: MeetingParticipantRole;
    }) => updateMeetingParticipantRole(joinToken, userId, role),
    onSuccess: () => {
      invalidateParticipants();
      toast.success("Participant role updated");
    },
    onError: () => {
      toast.error("Could not update participant role");
    },
  });

  const stopParticipantScreenShare = useMutation({
    mutationFn: (userId: string) =>
      stopParticipantScreenShareApi(joinToken, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: meetingKeys.access(joinToken),
      });
      queryClient.invalidateQueries({
        queryKey: meetingKeys.room(joinToken),
      });
      toast.success("Screen sharing stopped");
    },
    onError: () => {
      toast.error("Could not stop screen sharing");
    },
  });

  const lowerParticipantHand = useMutation({
    mutationFn: (userId: string) =>
      updateMeetingParticipantHandState(joinToken, userId, { raised: false }),
    onSuccess: () => {
      invalidateParticipants();
    },
    onError: () => {
      toast.error("Could not lower participant hand");
    },
  });

  return {
    removeParticipant,
    updateRole,
    stopParticipantScreenShare,
    lowerParticipantHand,
    invalidateParticipants,
  };
}

export function useLeaveMeeting(joinToken: string) {
  return useMutation({
    mutationFn: () => leaveMeeting(joinToken),
  });
}

export function useEndMeeting(joinToken: string) {
  return useMutation({
    mutationFn: () => endMeeting(joinToken),
    onError: () => {
      toast.error("Could not end meeting");
    },
  });
}
