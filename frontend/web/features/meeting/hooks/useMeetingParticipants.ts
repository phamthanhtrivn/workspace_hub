"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  endMeeting,
  getMeetingParticipants,
  leaveMeeting,
  removeMeetingParticipant,
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
  const intl = useAppIntl();
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
      toast.success(
        intl.formatMessage({ id: "meeting.participants.removeSuccess" }),
      );
    },
    onError: () => {
      toast.error(
        intl.formatMessage({ id: "meeting.participants.removeFailed" }),
      );
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
      toast.success(
        intl.formatMessage({ id: "meeting.participants.roleUpdateSuccess" }),
      );
    },
    onError: () => {
      toast.error(
        intl.formatMessage({ id: "meeting.participants.roleUpdateFailed" }),
      );
    },
  });

  return {
    removeParticipant,
    updateRole,
    invalidateParticipants,
  };
}

export function useLeaveMeeting(joinToken: string) {
  return useMutation({
    mutationFn: () => leaveMeeting(joinToken),
  });
}

export function useEndMeeting(joinToken: string) {
  const intl = useAppIntl();

  return useMutation({
    mutationFn: () => endMeeting(joinToken),
    onError: () => {
      toast.error(intl.formatMessage({ id: "meeting.room.endFailed" }));
    },
  });
}
