"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { meetingSummaryApi } from "../api/meeting-summary.api";

export function useMeetingSummary(recordingId: string) {
  const userId = useAppSelector((state) => state.auth.userId);
  const client = useQueryClient();
  const queryKey = ["meeting-summary", userId, recordingId];
  const query = useQuery({
    queryKey,
    queryFn: () => meetingSummaryApi.get(recordingId),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: (query) =>
      ["QUEUED", "RUNNING"].includes(query.state.data?.status ?? "")
        ? 4000
        : false,
  });
  const create = useMutation({
    mutationFn: () => meetingSummaryApi.start(recordingId),
    retry: false,
    onSuccess: (data) => {
      client.setQueryData(queryKey, data);
    },
  });
  return {
    summary: query.isError ? undefined : query.data,
    loading: query.isLoading,
    unavailable: query.isError,
    creating: create.isPending,
    createError: create.isError,
    create: () => create.mutate(),
    refresh: () => query.refetch(),
  };
}
