"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
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
  const intl = useAppIntl();
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
      const messageId =
        payload.screenShareEnabled !== undefined
          ? "meeting.room.settings.screenShareUpdated"
          : payload.chatEnabled === undefined
            ? "meeting.room.settings.autoAdmitUpdated"
            : "meeting.room.settings.participantChatUpdated";

      toast.success(intl.formatMessage({ id: messageId }));
      return response;
    },
    onError: (_error, payload) => {
      const messageId =
        payload.screenShareEnabled !== undefined
          ? "meeting.room.settings.screenShareUpdateFailed"
          : payload.chatEnabled === undefined
            ? "meeting.room.settings.autoAdmitUpdateFailed"
            : "meeting.room.settings.participantChatUpdateFailed";

      toast.error(intl.formatMessage({ id: messageId }));
    },
  });
}

export function useMeetingJoinRequestActions(joinToken: string) {
  const intl = useAppIntl();
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
      toast.success(intl.formatMessage({ id: "meeting.admission.approved" }));
    },
    onError: () => {
      toast.error(intl.formatMessage({ id: "meeting.admission.approveFailed" }));
    },
  });
  const declineOne = useMutation({
    mutationFn: (userId: string) => declineMeetingJoinRequest(joinToken, userId),
    onSuccess: () => {
      invalidateRequests();
      toast.success(intl.formatMessage({ id: "meeting.admission.declined" }));
    },
    onError: () => {
      toast.error(intl.formatMessage({ id: "meeting.admission.declineFailed" }));
    },
  });
  const approveAll = useMutation({
    mutationFn: () => approveAllMeetingJoinRequests(joinToken),
    onSuccess: () => {
      invalidateRequests();
      toast.success(intl.formatMessage({ id: "meeting.admission.approvedAll" }));
    },
    onError: () => {
      toast.error(
        intl.formatMessage({ id: "meeting.admission.approveAllFailed" }),
      );
    },
  });
  const declineAll = useMutation({
    mutationFn: () => declineAllMeetingJoinRequests(joinToken),
    onSuccess: () => {
      invalidateRequests();
      toast.success(intl.formatMessage({ id: "meeting.admission.declinedAll" }));
    },
    onError: () => {
      toast.error(
        intl.formatMessage({ id: "meeting.admission.declineAllFailed" }),
      );
    },
  });

  return {
    approveOne,
    declineOne,
    approveAll,
    declineAll,
  };
}
