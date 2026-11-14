import {
  MeetingDashboardNavItemId,
  meetingDashboardNavItems,
} from "../types/meeting.constants";

export const MEETING_QUERY = {
  view: "view",
  legacyTab: "tab",
  meeting: "meeting",
} as const;

export function parseMeetingView(
  params: URLSearchParams,
): MeetingDashboardNavItemId {
  const value = (
    params.get(MEETING_QUERY.view) ?? params.get(MEETING_QUERY.legacyTab)
  )?.toLowerCase();

  return (
    meetingDashboardNavItems.find((item) => item.id === value)?.id ??
    MeetingDashboardNavItemId.OVERVIEW
  );
}

export function canonicalizeMeetingQuery(
  params: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const view = parseMeetingView(params);
  if (view === MeetingDashboardNavItemId.OVERVIEW)
    next.delete(MEETING_QUERY.view);
  else next.set(MEETING_QUERY.view, view);
  next.delete(MEETING_QUERY.legacyTab);

  return next;
}

export function meetingViewQuery(
  params: URLSearchParams,
  view: MeetingDashboardNavItemId,
): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set(MEETING_QUERY.view, view);
  if (view !== MeetingDashboardNavItemId.UPCOMING)
    next.delete(MEETING_QUERY.meeting);

  return canonicalizeMeetingQuery(next);
}
