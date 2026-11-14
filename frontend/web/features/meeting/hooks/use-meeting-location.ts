"use client";

import { useEffect } from "react";
import { useUrlQuery } from "@/hooks/use-url-query";
import type { MeetingDashboardNavItemId } from "../types/meeting.constants";
import {
  canonicalizeMeetingQuery,
  MEETING_QUERY,
  meetingViewQuery,
  parseMeetingView,
} from "../utils/meeting-navigation";

export function useMeetingLocation() {
  const { params, updateQuery } = useUrlQuery();
  const query = params.toString();
  const activeView = parseMeetingView(new URLSearchParams(query));
  useEffect(() => {
    if (
      canonicalizeMeetingQuery(new URLSearchParams(query)).toString() !== query
    )
      updateQuery(canonicalizeMeetingQuery);
  }, [query, updateQuery]);

  return {
    activeView,
    highlightedMeeting: params.get(MEETING_QUERY.meeting),
    changeView: (view: MeetingDashboardNavItemId) =>
      updateQuery((current) => meetingViewQuery(current, view), "push"),
  };
}
