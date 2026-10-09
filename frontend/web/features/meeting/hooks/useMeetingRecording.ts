"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { recordingApi } from "../api/meeting-recording.api";
import type { RecordingLayout } from "../types/meeting-recording.types";
import { meetingKeys } from "../types/meeting.query-keys";
import { useRecordingEvents } from "./useRecordingEvents";
import { useAppSelector } from "@/store/store";

export function recordingErrorMessage(error: unknown) {
  return isAxiosError<{ message?: string }>(error)
    ? (error.response?.data.message ?? "Could not update recording")
    : "Could not update recording";
}

export function useMeetingRecording(joinToken: string, meetingId: string) {
  const userId = useAppSelector((state) => state.auth.userId);
  const client = useQueryClient();
  const queryKey = ["meeting-recording-status", userId, joinToken];
  const query = useQuery({
    queryKey,
    queryFn: () => recordingApi.status(joinToken),
    refetchInterval: 5000,
    retry: false,
    enabled: Boolean(userId),
  });
  const refresh = useCallback(() => {
    void client.invalidateQueries({
      queryKey: ["meeting-recording-status", userId, joinToken],
    });
    void client.invalidateQueries({ queryKey: ["meeting-recordings", userId] });
    void client.invalidateQueries({
      queryKey: meetingKeys.participantsRoot(joinToken),
    });
  }, [client, joinToken, userId]);
  useRecordingEvents(refresh, meetingId);
  const start = useMutation({
    mutationFn: ({ layout, key }: { layout: RecordingLayout; key: string }) =>
      recordingApi.start(joinToken, layout, key),
    onSuccess: refresh,
    onError: (error) => {
      toast.error(recordingErrorMessage(error));
      refresh();
    },
  });
  const stop = useMutation({
    mutationFn: ({ id, key }: { id: string; key: string }) =>
      recordingApi.stop(joinToken, id, key),
    onSuccess: refresh,
    onError: (error) => {
      toast.error(recordingErrorMessage(error));
      refresh();
    },
  });
  return { query, start, stop };
}
