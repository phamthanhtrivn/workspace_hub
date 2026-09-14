"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  approveAllMeetingJoinRequests,
  approveMeetingJoinRequest,
  declineAllMeetingJoinRequests,
  declineMeetingJoinRequest,
  getMeetingJoinRequests,
  updateMeetingSettings,
} from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import type { UpdateMeetingSettingsPayload } from "../types/meeting.types";

const joinRequestPageSize = 8;

export function useMeetingJoinRequests({
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
    queryKey: meetingKeys.joinRequests(joinToken, search, page),
    queryFn: () =>
      getMeetingJoinRequests({
        joinToken,
        search,
        page,
        limit: joinRequestPageSize,
      }),
    enabled: enabled && Boolean(joinToken),
  });
}

export function useMeetingJoinRequestCount({
  joinToken,
  enabled,
}: {
  joinToken: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: meetingKeys.joinRequestCount(joinToken),
    queryFn: () =>
      getMeetingJoinRequests({
        joinToken,
        search: "",
        page: 1,
        limit: 1,
      }),
    enabled: enabled && Boolean(joinToken),
  });
}

export function useUpdateMeetingSettings(joinToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMeetingSettingsPayload) =>
      updateMeetingSettings(joinToken, payload),
    onSuccess: (response, payload) => {
      queryClient.invalidateQueries({
        queryKey: meetingKeys.access(joinToken),
      });
      queryClient.invalidateQueries({
        queryKey: meetingKeys.room(joinToken),
      });
      const message =
        payload.screenShareEnabled !== undefined
          ? "Screen share settings updated"
          : payload.chatEnabled === undefined
            ? "Room admission settings updated"
            : "Participant chat settings updated";

      toast.success(message);
      return response;
    },
    onError: (_error, payload) => {
      const message =
        payload.screenShareEnabled !== undefined
          ? "Could not update screen share settings"
          : payload.chatEnabled === undefined
            ? "Could not update room admission settings"
            : "Could not update participant chat settings";

      toast.error(message);
    },
  });
}

export function useMeetingJoinRequestActions(joinToken: string) {
  const queryClient = useQueryClient();
  const invalidateRequests = () => {
    queryClient.invalidateQueries({
      queryKey: meetingKeys.joinRequestsRoot(joinToken),
    });
    queryClient.invalidateQueries({
      queryKey: meetingKeys.joinRequestCount(joinToken),
    });
  };

  const approveOne = useMutation({
    mutationFn: (userId: string) => approveMeetingJoinRequest(joinToken, userId),
    onSuccess: () => {
      invalidateRequests();
      toast.success("Request approved");
    },
    onError: () => {
      toast.error("Could not approve request");
    },
  });
  const declineOne = useMutation({
    mutationFn: (userId: string) => declineMeetingJoinRequest(joinToken, userId),
    onSuccess: () => {
      invalidateRequests();
      toast.success("Request declined");
    },
    onError: () => {
      toast.error("Could not decline request");
    },
  });
  const approveAll = useMutation({
    mutationFn: () => approveAllMeetingJoinRequests(joinToken),
    onSuccess: () => {
      invalidateRequests();
      toast.success("All requests approved");
    },
    onError: () => {
      toast.error("Could not approve all requests");
    },
  });
  const declineAll = useMutation({
    mutationFn: () => declineAllMeetingJoinRequests(joinToken),
    onSuccess: () => {
      invalidateRequests();
      toast.success("All requests declined");
    },
    onError: () => {
      toast.error("Could not decline all requests");
    },
  });

  return {
    approveOne,
    declineOne,
    approveAll,
    declineAll,
  };
}
