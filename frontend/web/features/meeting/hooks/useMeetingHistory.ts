"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getMeetingHistory,
  getMeetingHistorySummary,
} from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";

export const meetingHistoryPageSize = 9;

export function useMeetingHistory({
  page,
  enabled,
  limit = meetingHistoryPageSize,
  refetchOnWindowFocus = false,
}: {
  page: number;
  enabled: boolean;
  limit?: number;
  refetchOnWindowFocus?: boolean;
}) {
  return useQuery({
    queryKey: meetingKeys.history(page, limit),
    queryFn: () =>
      getMeetingHistory({
        page,
        limit,
      }),
    enabled,
    refetchOnWindowFocus,
  });
}

export function useMeetingHistorySummary() {
  return useQuery({
    queryKey: meetingKeys.historySummary,
    queryFn: getMeetingHistorySummary,
  });
}
