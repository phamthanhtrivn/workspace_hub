"use client";

import { useQuery } from "@tanstack/react-query";
import { getMeetingHistory } from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";

export const meetingHistoryPageSize = 8;

export function useMeetingHistory({
  page,
  enabled,
}: {
  page: number;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: meetingKeys.history(page, meetingHistoryPageSize),
    queryFn: () =>
      getMeetingHistory({
        page,
        limit: meetingHistoryPageSize,
      }),
    enabled,
  });
}
