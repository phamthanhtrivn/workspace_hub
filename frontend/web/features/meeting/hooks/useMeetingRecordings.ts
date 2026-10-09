"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import { recordingApi } from "../api/meeting-recording.api";
import type { RecordingQuery } from "../types/meeting-recording.types";
import { recordingErrorMessage } from "./useMeetingRecording";
import { useRecordingEvents } from "./useRecordingEvents";

export function useMeetingRecordings(params: RecordingQuery) {
  const userId = useAppSelector((state) => state.auth.userId);
  const client = useQueryClient();
  const refresh = useCallback(() => {
    void client.invalidateQueries({ queryKey: ["meeting-recordings", userId] });
  }, [client, userId]);
  useRecordingEvents(refresh);
  const query = useQuery({
    queryKey: ["meeting-recordings", userId, params],
    queryFn: () => recordingApi.list(params),
    enabled: Boolean(userId),
    refetchInterval: 15000,
  });
  const remove = useMutation({
    mutationFn: recordingApi.delete,
    onSuccess: () => {
      refresh();
      toast.success("Recording deleted");
    },
    onError: (error) => toast.error(recordingErrorMessage(error)),
  });
  return { query, remove, refresh };
}
