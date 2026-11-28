"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptScheduledMeetingInvitation,
  cancelScheduledMeeting,
  createScheduledMeeting,
  declineScheduledMeetingInvitation,
  getUpcomingMeetings,
  startScheduledMeeting,
  updateScheduledMeeting,
} from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import { MEETING_LIST_PAGE_SIZE } from "../types/meeting.constants";
import type {
  JoinMeetingPayload,
  ScheduledMeetingPayload,
  UpdateScheduledMeetingPayload,
} from "../types/meeting.types";

export const upcomingMeetingsPageSize = MEETING_LIST_PAGE_SIZE;

export function useUpcomingMeetings({
  page = 1,
  limit = upcomingMeetingsPageSize,
  enabled = true,
  refetchOnWindowFocus = false,
}: {
  page?: number;
  limit?: number;
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
}) {
  return useQuery({
    queryKey: meetingKeys.upcoming(page, limit),
    queryFn: () => getUpcomingMeetings({ page, limit }),
    enabled,
    refetchOnWindowFocus,
  });
}

export function useCreateScheduledMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ScheduledMeetingPayload) =>
      createScheduledMeeting(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.upcomingRoot,
      });
    },
  });
}

export function useStartScheduledMeeting(joinToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: JoinMeetingPayload) =>
      startScheduledMeeting(joinToken, payload),
    onSuccess: (response) => {
      queryClient.setQueryData(meetingKeys.room(joinToken), response);
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.access(joinToken),
      });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.upcomingRoot,
      });
    },
  });
}

export function useUpdateScheduledMeeting(joinToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateScheduledMeetingPayload) =>
      updateScheduledMeeting(joinToken, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.access(joinToken),
      });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.upcomingRoot,
      });
    },
  });
}

export function useCancelScheduledMeeting(joinToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelScheduledMeeting(joinToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.access(joinToken),
      });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.upcomingRoot,
      });
    },
  });
}

export function useRespondMeetingInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      joinToken,
      action,
    }: {
      joinToken: string;
      action: "accept" | "decline";
    }) =>
      action === "accept"
        ? acceptScheduledMeetingInvitation(joinToken)
        : declineScheduledMeetingInvitation(joinToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.upcomingRoot,
      });
    },
  });
}
