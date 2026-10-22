"use client";

import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { recordingApi } from "../api/meeting-recording.api";
import type {
  RecordingLayout,
  RecordingSettings,
  RecordingRoomStatus,
} from "../types/meeting-recording.types";
import { meetingKeys } from "../types/meeting.query-keys";
import { useRecordingEvents } from "./useRecordingEvents";
import { useAppSelector } from "@/store/store";
import {
  recordingPollInterval,
  recordingRequestRefreshAt,
} from "../utils/recording-polling";
import {
  recordingErrorMessage,
  recordingErrorIsPermanent,
} from "../utils/recording-errors";

export function useMeetingRecording(
  joinToken: string,
  meetingId: string,
  observeOnly = false,
) {
  const userId = useAppSelector((state) => state.auth.userId);
  const client = useQueryClient();
  const refresh = useCallback(() => {
    void client.invalidateQueries({
      queryKey: ["meeting-recording-status", userId, joinToken],
    });
    void client.invalidateQueries({ queryKey: ["meeting-recordings", userId] });
  }, [client, joinToken, userId]);
  const handleMutationError = (error: unknown) => {
    toast.error(recordingErrorMessage(error));
    refresh();
  };
  const connected = useRecordingEvents(refresh, meetingId, !observeOnly);
  const query = useQuery({
    queryKey: ["meeting-recording-status", userId, joinToken],
    queryFn: () => recordingApi.status(joinToken),
    refetchInterval: (query) => {
      if (observeOnly || recordingErrorIsPermanent(query.state.error))
        return false;
      if (query.state.error) return 30_000;
      return recordingPollInterval(query.state.data, connected);
    },
    staleTime: 2000,
    retry: false,
    enabled: Boolean(userId),
  });
  useEffect(() => {
    const requestRefreshAt = recordingRequestRefreshAt(query.data, Date.now());
    if (observeOnly || requestRefreshAt === undefined) return;
    const timer = window.setTimeout(
      () => {
        void client.invalidateQueries({
          queryKey: ["meeting-recording-status", userId, joinToken],
        });
      },
      Math.max(1, requestRefreshAt - Date.now() + 100),
    );
    return () => window.clearTimeout(timer);
  }, [query.data, observeOnly, client, userId, joinToken]);
  const start = useMutation({
    mutationFn: ({ layout, key, captureTrackSid }: { layout: RecordingLayout; key: string; captureTrackSid?: string }) =>
      recordingApi.start(joinToken, layout, key, captureTrackSid),
    onSuccess: refresh,
    onError: handleMutationError,
  });
  const stop = useMutation({
    mutationFn: ({ id, key }: { id: string; key: string }) =>
      recordingApi.stop(joinToken, id, key),
    onSuccess: refresh,
    onError: handleMutationError,
  });
  const pause = useMutation({
    mutationFn: ({ id, key }: { id: string; key: string }) =>
      recordingApi.pause(joinToken, id, key),
    onSuccess: refresh,
    onError: handleMutationError,
  });
  const resume = useMutation({
    mutationFn: ({ id, key }: { id: string; key: string }) =>
      recordingApi.resume(joinToken, id, key),
    onSuccess: refresh,
    onError: handleMutationError,
  });
  const configure = useMutation({
    mutationFn: (settings: RecordingSettings) =>
      recordingApi.configure(joinToken, settings),
    onSuccess: refresh,
    onError: handleMutationError,
  });
  const requestPermission = useMutation({
    mutationFn: () => recordingApi.requestPermission(joinToken),
    onSuccess: (request) => {
      client.setQueryData<RecordingRoomStatus>(
        ["meeting-recording-status", userId, joinToken],
        (current) =>
          current
            ? {
                ...current,
                recordingRequest: request,
                canRequestRecording: false,
              }
            : current,
      );
      toast.success("Recording permission request sent to the host");
      refresh();
    },
    onError: handleMutationError,
  });
  const answerPermissionRequest = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      recordingApi.answerPermissionRequest(joinToken, id, approve),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: meetingKeys.participantsRoot(joinToken),
      });
      refresh();
    },
    onError: handleMutationError,
  });
  return {
    query,
    start,
    stop,
    pause,
    resume,
    configure,
    requestPermission,
    answerPermissionRequest,
  };
}
