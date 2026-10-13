"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { recordingApi } from "../api/meeting-recording.api";
import type { RecordingLayout } from "../types/meeting-recording.types";
import { useRecordingEvents } from "./useRecordingEvents";
import { useAppSelector } from "@/store/store";

export function recordingErrorMessage(error: unknown) {
  return isAxiosError<{ message?: string }>(error)
    ? (error.response?.data.message ?? "Could not update recording")
    : "Could not update recording";
}

export function recordingErrorIsPermanent(error: unknown) {
  return (
    isAxiosError(error) &&
    [400, 401, 403, 404].includes(error.response?.status ?? 0)
  );
}

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
  const connected = useRecordingEvents(refresh, meetingId, !observeOnly);
  const query = useQuery({
    queryKey: ["meeting-recording-status", userId, joinToken],
    queryFn: () => recordingApi.status(joinToken),
    refetchInterval: (query) => {
      if (observeOnly || recordingErrorIsPermanent(query.state.error))
        return false;
      if (query.state.error) return 30_000;
      const status = query.state.data?.recording?.status;
      if (status === "STARTING" || status === "PROCESSING") return 3000;
      return connected ? 30_000 : 5000;
    },
    staleTime: 2000,
    retry: false,
    enabled: Boolean(userId),
  });
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
