"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getMeetingHistory,
  getMeetingHistorySummary,
} from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import { MEETING_LIST_PAGE_SIZE } from "../types/meeting.constants";
import type { MeetingHistoryVisibility } from "../types/meeting.types";

export const meetingHistoryPageSize = MEETING_LIST_PAGE_SIZE;

export function useMeetingHistory({
  page,
  enabled,
  limit = meetingHistoryPageSize,
  refetchOnWindowFocus = false,
  visibility = "visible",
}: {
  page: number;
  enabled: boolean;
  limit?: number;
  refetchOnWindowFocus?: boolean;
  visibility?: MeetingHistoryVisibility;
}) {
  return useQuery({
    queryKey: meetingKeys.history(page, limit, visibility),
    queryFn: () =>
      getMeetingHistory({
        page,
        limit,
        visibility,
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
