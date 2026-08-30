import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  approveAllMeetingJoinRequests,
  approveMeetingJoinRequest,
  createInstantMeeting,
  endMeeting,
  getMeetingLiveKitToken,
  getMeetingJoinInfo,
  getMeetingJoinRequests,
  getMeetingParticipants,
  getMeetings,
  leaveMeeting,
  removeMeetingParticipant,
  rejectMeetingJoinRequest,
  reportMeetingLiveKitConnected,
  requestJoinMeeting,
  updateMeetingAccess,
  updateMeetingParticipantRole,
} from "../../api/meeting.api";
import { meetingKeys } from "../../types/meeting.constants";
import {
  CreateInstantMeetingRequest,
  MeetingListQueryParams,
  MeetingRole,
  UpdateMeetingAccessRequest,
  UpdateMeetingParticipantRoleRequest,
} from "../../types/meeting.types";

export function useMeetingsQuery() {
  return useQuery({
    queryKey: meetingKeys.all,
    queryFn: getMeetings,
  });
}

export function useMeetingJoinInfoQuery(joinToken: string) {
  return useQuery({
    queryKey: meetingKeys.join(joinToken),
    queryFn: () => getMeetingJoinInfo(joinToken),
    enabled: Boolean(joinToken),
    retry: (failureCount, error) =>
      !(axios.isAxiosError(error) && error.response?.status === 404) &&
      failureCount < 3,
  });
}

export function useMeetingJoinRequestsQuery(
  meetingId: string | undefined,
  params: MeetingListQueryParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: meetingKeys.requests(
      meetingId ?? "",
      params.search ?? "",
      params.page ?? 1,
      params.limit ?? 10,
    ),
    queryFn: () => getMeetingJoinRequests(meetingId ?? "", params),
    enabled: Boolean(meetingId) && enabled,
    refetchInterval: enabled ? 15_000 : false,
  });
}

export function useMeetingParticipantsQuery(
  meetingId: string | undefined,
  params: MeetingListQueryParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: meetingKeys.participants(
      meetingId ?? "",
      params.search ?? "",
      params.page ?? 1,
      params.limit ?? 10,
    ),
    queryFn: () => getMeetingParticipants(meetingId ?? "", params),
    enabled: Boolean(meetingId) && enabled,
  });
}

export function useMeetingLiveKitTokenQuery(
  meetingId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: meetingKeys.liveKitToken(meetingId ?? ""),
    queryFn: () => getMeetingLiveKitToken(meetingId ?? ""),
    enabled: Boolean(meetingId) && enabled,
    retry: false,
  });
}

export function useCreateInstantMeetingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInstantMeetingRequest) =>
      createInstantMeeting(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
}

export function useRequestJoinMeetingMutation(joinToken?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingId: string) => requestJoinMeeting(meetingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      if (joinToken) {
        void queryClient.invalidateQueries({
          queryKey: meetingKeys.join(joinToken),
        });
      }
    },
  });
}

export function useApproveMeetingJoinRequestMutation(meetingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      approveMeetingJoinRequest(meetingId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.requestsRoot(meetingId),
      });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.participantsRoot(meetingId),
      });
    },
  });
}

export function useReportMeetingLiveKitConnectedMutation(
  meetingId: string,
  joinToken?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => reportMeetingLiveKitConnected(meetingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.participantsRoot(meetingId),
      });
      if (joinToken) {
        void queryClient.invalidateQueries({
          queryKey: meetingKeys.join(joinToken),
        });
      }
    },
  });
}

export function useApproveAllMeetingJoinRequestsMutation(meetingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => approveAllMeetingJoinRequests(meetingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.requestsRoot(meetingId),
      });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.participantsRoot(meetingId),
      });
    },
  });
}

export function useRejectMeetingJoinRequestMutation(meetingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => rejectMeetingJoinRequest(meetingId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.requestsRoot(meetingId),
      });
    },
  });
}

export function useUpdateMeetingAccessMutation(
  meetingId: string,
  joinToken?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMeetingAccessRequest) =>
      updateMeetingAccess(meetingId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      if (joinToken) {
        void queryClient.invalidateQueries({
          queryKey: meetingKeys.join(joinToken),
        });
      }
    },
  });
}

export function useLeaveMeetingMutation(meetingId: string, joinToken?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => leaveMeeting(meetingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.requestsRoot(meetingId),
      });
      if (joinToken) {
        void queryClient.invalidateQueries({
          queryKey: meetingKeys.join(joinToken),
        });
      }
    },
  });
}

export function useEndMeetingMutation(meetingId: string, joinToken?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => endMeeting(meetingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.requestsRoot(meetingId),
      });
      if (joinToken) {
        void queryClient.invalidateQueries({
          queryKey: meetingKeys.join(joinToken),
        });
      }
    },
  });
}

export function useUpdateMeetingParticipantRoleMutation(
  meetingId: string,
  joinToken?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: { userId: string } & UpdateMeetingParticipantRoleRequest) =>
      updateMeetingParticipantRole(meetingId, userId, { role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.participantsRoot(meetingId),
      });
      if (joinToken) {
        void queryClient.invalidateQueries({
          queryKey: meetingKeys.join(joinToken),
        });
      }
    },
  });
}

export function useRemoveMeetingParticipantMutation(
  meetingId: string,
  joinToken?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => removeMeetingParticipant(meetingId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.participantsRoot(meetingId),
      });
      if (joinToken) {
        void queryClient.invalidateQueries({
          queryKey: meetingKeys.join(joinToken),
        });
      }
    },
  });
}

export const meetingRoleMutationValues = {
  host: MeetingRole.HOST,
  cohost: MeetingRole.COHOST,
  participant: MeetingRole.PARTICIPANT,
} as const;
