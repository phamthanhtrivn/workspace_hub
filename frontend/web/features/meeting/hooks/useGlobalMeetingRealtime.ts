"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { meetingKeys } from "../types/meeting.query-keys";
import { useMeetingSocket } from "./useMeetingSocket";

/**
 * Reuses the shared `/communication.io` socket (no extra connection) so
 * meeting badges and lists stay fresh from any workspace page.
 */
export function useGlobalMeetingRealtime() {
  const queryClient = useQueryClient();
  const refreshMeetings = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: meetingKeys.upcomingRoot });
    void queryClient.invalidateQueries({ queryKey: meetingKeys.historyRoot });
  }, [queryClient]);

  useMeetingSocket({
    onStatusUpdated: refreshMeetings,
    onMeetingEnded: refreshMeetings,
    onHistoryVisibilityUpdated: refreshMeetings,
    onReconnect: refreshMeetings,
  });
}
