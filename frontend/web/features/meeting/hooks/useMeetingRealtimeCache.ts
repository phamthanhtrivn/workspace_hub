"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/features/chat/types/chat.types";
import { meetingKeys } from "../types/meeting.query-keys";
import type {
  InstantMeetingResponse,
  MeetingAccessResponse,
  MeetingParticipantResponse,
  MeetingParticipantRole,
  MeetingParticipantsResponse,
} from "../types/meeting.types";

export function useMeetingRealtimeCache(joinToken: string) {
  const queryClient = useQueryClient();

  const patchParticipantInCachedPages = useCallback(
    (participant: MeetingParticipantResponse) => {
      queryClient.setQueriesData<ApiResponse<MeetingParticipantsResponse>>(
        { queryKey: meetingKeys.participantsRoot(joinToken) },
        (current) => {
          if (!current?.data.items.length) return current;

          let didPatch = false;
          const items = current.data.items.map((item) => {
            if (item.userId !== participant.userId) return item;

            didPatch = true;
            return participant;
          });

          if (!didPatch) return current;

          return {
            ...current,
            data: {
              ...current.data,
              items,
            },
          };
        },
      );
    },
    [joinToken, queryClient],
  );

  const removeParticipantFromCachedPages = useCallback(
    (userId: string) => {
      queryClient.setQueriesData<ApiResponse<MeetingParticipantsResponse>>(
        { queryKey: meetingKeys.participantsRoot(joinToken) },
        (current) => {
          if (!current?.data.items.length) return current;

          const items = current.data.items.filter(
            (participant) => participant.userId !== userId,
          );
          if (items.length === current.data.items.length) return current;

          const total = Math.max(0, current.data.total - 1);

          return {
            ...current,
            data: {
              ...current.data,
              items,
              total,
              totalPages: Math.max(1, Math.ceil(total / current.data.limit)),
            },
          };
        },
      );
    },
    [joinToken, queryClient],
  );

  const patchRoomAutoAdmit = useCallback(
    (autoAdmit: boolean) => {
      queryClient.setQueryData<ApiResponse<MeetingAccessResponse>>(
        meetingKeys.access(joinToken),
        (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  autoAdmit,
                },
              }
            : current,
      );
      queryClient.setQueryData<ApiResponse<InstantMeetingResponse>>(
        meetingKeys.room(joinToken),
        (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  meeting: {
                    ...current.data.meeting,
                    autoAdmit,
                  },
                },
              }
            : current,
      );
    },
    [joinToken, queryClient],
  );

  const patchCurrentUserRole = useCallback(
    (role: MeetingParticipantRole) => {
      queryClient.setQueryData<ApiResponse<MeetingAccessResponse>>(
        meetingKeys.access(joinToken),
        (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  participantRole: role,
                },
              }
            : current,
      );
      queryClient.setQueryData<ApiResponse<InstantMeetingResponse>>(
        meetingKeys.room(joinToken),
        (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  meeting: {
                    ...current.data.meeting,
                    participantRole: role,
                  },
                },
              }
            : current,
      );
    },
    [joinToken, queryClient],
  );

  return {
    patchParticipantInCachedPages,
    removeParticipantFromCachedPages,
    patchRoomAutoAdmit,
    patchCurrentUserRole,
  };
}
