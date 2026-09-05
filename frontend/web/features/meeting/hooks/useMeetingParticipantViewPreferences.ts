"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import type { ApiResponse } from "@/features/chat/types/chat.types";
import {
  getMeetingParticipantViewPreferences,
  updateMeetingParticipantViewPreference,
} from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import type {
  MeetingParticipantViewPreferenceResponse,
  MeetingParticipantViewPreferencesResponse,
  UpdateMeetingParticipantViewPreferencePayload,
} from "../types/meeting.types";

interface UpdateParticipantViewPreferenceVariables {
  targetUserId: string;
  preference: UpdateMeetingParticipantViewPreferencePayload;
}

interface UpdateParticipantViewPreferenceContext {
  previousPreferences?: ApiResponse<MeetingParticipantViewPreferencesResponse>;
}

const EMPTY_PREFERENCES: MeetingParticipantViewPreferenceResponse[] = [];

function shouldKeepPreference(
  preference: MeetingParticipantViewPreferenceResponse,
) {
  return preference.audioMuted || preference.pinned;
}

function applyOptimisticPreferenceUpdate(
  current: ApiResponse<MeetingParticipantViewPreferencesResponse> | undefined,
  targetUserId: string,
  preference: UpdateMeetingParticipantViewPreferencePayload,
): ApiResponse<MeetingParticipantViewPreferencesResponse> | undefined {
  if (!current) return current;

  const now = new Date().toISOString();
  const items = current.data.items.map((item) => {
    const isTarget = item.targetUserId === targetUserId;
    const shouldClearPinned = preference.pinned === true && !isTarget;

    return {
      ...item,
      audioMuted: isTarget ? preference.audioMuted ?? item.audioMuted : item.audioMuted,
      pinned: isTarget
        ? preference.pinned ?? item.pinned
        : shouldClearPinned
          ? false
          : item.pinned,
      updatedAt: isTarget ? now : item.updatedAt,
    };
  });
  const targetExists = items.some((item) => item.targetUserId === targetUserId);

  if (!targetExists) {
    items.push({
      meetingId: "",
      viewerUserId: "",
      targetUserId,
      audioMuted: preference.audioMuted ?? false,
      pinned: preference.pinned ?? false,
      updatedAt: now,
    });
  }

  return {
    ...current,
    data: {
      items: items.filter(shouldKeepPreference),
    },
  };
}

export function useMeetingParticipantViewPreferences(joinToken: string) {
  const intl = useAppIntl();
  const queryClient = useQueryClient();
  const queryKey = meetingKeys.participantViewPreferences(joinToken);
  const preferencesQuery = useQuery({
    queryKey,
    queryFn: () => getMeetingParticipantViewPreferences(joinToken),
    enabled: Boolean(joinToken),
  });
  const preferenceItems =
    preferencesQuery.data?.data.items ?? EMPTY_PREFERENCES;
  const mutedParticipantIds = useMemo(
    () =>
      new Set(
        preferenceItems
          .filter((preference) => preference.audioMuted)
          .map((preference) => preference.targetUserId),
      ),
    [preferenceItems],
  );
  const pinnedParticipantId = useMemo(
    () =>
      preferenceItems.find((preference) => preference.pinned)?.targetUserId ??
      null,
    [preferenceItems],
  );
  const updatePreference = useMutation<
    ApiResponse<MeetingParticipantViewPreferencesResponse>,
    Error,
    UpdateParticipantViewPreferenceVariables,
    UpdateParticipantViewPreferenceContext
  >({
    mutationFn: ({ targetUserId, preference }) =>
      updateMeetingParticipantViewPreference(joinToken, targetUserId, preference),
    onMutate: async ({ targetUserId, preference }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousPreferences =
        queryClient.getQueryData<
          ApiResponse<MeetingParticipantViewPreferencesResponse>
        >(queryKey);

      queryClient.setQueryData<
        ApiResponse<MeetingParticipantViewPreferencesResponse>
      >(queryKey, (current) =>
        applyOptimisticPreferenceUpdate(current, targetUserId, preference),
      );

      return { previousPreferences };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(queryKey, context.previousPreferences);
      }

      toast.error(
        intl.formatMessage({
          id: "meeting.participants.preferenceUpdateFailed",
        }),
      );
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKey, response);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const toggleParticipantAudioMute = useCallback(
    (targetUserId: string) => {
      updatePreference.mutate({
        targetUserId,
        preference: { audioMuted: !mutedParticipantIds.has(targetUserId) },
      });
    },
    [mutedParticipantIds, updatePreference],
  );
  const toggleParticipantPin = useCallback(
    (targetUserId: string) => {
      updatePreference.mutate({
        targetUserId,
        preference: { pinned: pinnedParticipantId !== targetUserId },
      });
    },
    [pinnedParticipantId, updatePreference],
  );
  const isParticipantViewPreferencePending = useCallback(
    (targetUserId: string) =>
      updatePreference.isPending &&
      updatePreference.variables?.targetUserId === targetUserId,
    [updatePreference.isPending, updatePreference.variables?.targetUserId],
  );

  return {
    mutedParticipantIds,
    pinnedParticipantId,
    preferencesQuery,
    isParticipantViewPreferencePending,
    toggleParticipantAudioMute,
    toggleParticipantPin,
  };
}
