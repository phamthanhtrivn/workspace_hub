import { CalendarDays, History, Plus, Radio, UserRoundPlus, Video } from "lucide-react";
import { MeetingParticipantStatus } from "./meeting.types";

export enum MeetingApiRoute {
  ROOT = "/api/meetings",
  INSTANT = "/api/meetings/instant",
}

export const meetingApiRoutes = {
  joinInfo: (joinToken: string) => `${MeetingApiRoute.ROOT}/join/${joinToken}`,
  joinRequests: (meetingId: string) =>
    `${MeetingApiRoute.ROOT}/${meetingId}/join-requests`,
  approveJoinRequest: (meetingId: string, userId: string) =>
    `${MeetingApiRoute.ROOT}/${meetingId}/join-requests/${userId}/approve`,
  rejectJoinRequest: (meetingId: string, userId: string) =>
    `${MeetingApiRoute.ROOT}/${meetingId}/join-requests/${userId}/reject`,
  access: (meetingId: string) => `${MeetingApiRoute.ROOT}/${meetingId}/access`,
  leave: (meetingId: string) => `${MeetingApiRoute.ROOT}/${meetingId}/leave`,
  end: (meetingId: string) => `${MeetingApiRoute.ROOT}/${meetingId}/end`,
  liveKitToken: (meetingId: string) =>
    `${MeetingApiRoute.ROOT}/${meetingId}/livekit-token`,
};

export enum MeetingRouteSegment {
  MEETINGS = "meetings",
}

export enum MeetingQueryRoot {
  MEETINGS = "meetings",
  JOIN = "meeting-join",
  REQUESTS = "meeting-join-requests",
  LIVEKIT_TOKEN = "meeting-livekit-token",
}

export const meetingKeys = {
  all: [MeetingQueryRoot.MEETINGS] as const,
  join: (joinToken: string) =>
    [MeetingQueryRoot.JOIN, joinToken] as const,
  requests: (meetingId: string) =>
    [MeetingQueryRoot.REQUESTS, meetingId] as const,
  liveKitToken: (meetingId: string) =>
    [MeetingQueryRoot.LIVEKIT_TOKEN, meetingId] as const,
};

export enum MeetingStorageKey {
  DEVICE_PREFERENCES = "workspacehub.meeting.device-preferences",
}

export enum MeetingWindowTarget {
  NEW_TAB = "_blank",
}

export const meetingRoutes = {
  listPath: `/${MeetingRouteSegment.MEETINGS}`,
  joinPath: (joinToken: string) =>
    `/${MeetingRouteSegment.MEETINGS}/${joinToken}`,
  joinUrl: (joinToken: string) => {
    if (typeof window === "undefined") {
      return `/${MeetingRouteSegment.MEETINGS}/${joinToken}`;
    }
    return `${window.location.origin}/${MeetingRouteSegment.MEETINGS}/${joinToken}`;
  },
};

export const joinedMeetingStatuses = new Set<MeetingParticipantStatus>([
  MeetingParticipantStatus.JOINED,
]);

export enum MeetingDashboardNavItemId {
  OVERVIEW = "overview",
  UPCOMING = "upcoming",
  PREVIOUS = "previous",
  RECORDINGS = "recordings",
  PERSONAL_ROOM = "personal-room",
}

export enum MeetingDashboardActionId {
  NEW_MEETING = "new-meeting",
  JOIN_MEETING = "join-meeting",
  SCHEDULE_MEETING = "schedule-meeting",
  VIEW_RECORDINGS = "view-recordings",
}

export enum MeetingDashboardTone {
  PRIMARY = "primary",
  BLUE = "blue",
  VIOLET = "violet",
  AMBER = "amber",
}

export const meetingDashboardNavItems = [
  {
    id: MeetingDashboardNavItemId.OVERVIEW,
    labelId: "meeting.dashboard.nav.overview",
  },
  {
    id: MeetingDashboardNavItemId.UPCOMING,
    labelId: "meeting.dashboard.nav.upcoming",
  },
  {
    id: MeetingDashboardNavItemId.PREVIOUS,
    labelId: "meeting.dashboard.nav.previous",
  },
  {
    id: MeetingDashboardNavItemId.RECORDINGS,
    labelId: "meeting.dashboard.nav.recordings",
  },
  {
    id: MeetingDashboardNavItemId.PERSONAL_ROOM,
    labelId: "meeting.dashboard.nav.personalRoom",
  },
] as const;

export const meetingDashboardActions = [
  {
    id: MeetingDashboardActionId.NEW_MEETING,
    titleId: "meeting.dashboard.action.newMeeting.title",
    descriptionId: "meeting.dashboard.action.newMeeting.description",
    tone: MeetingDashboardTone.PRIMARY,
    enabled: true,
  },
  {
    id: MeetingDashboardActionId.JOIN_MEETING,
    titleId: "meeting.dashboard.action.joinMeeting.title",
    descriptionId: "meeting.dashboard.action.joinMeeting.description",
    tone: MeetingDashboardTone.BLUE,
    enabled: false,
  },
  {
    id: MeetingDashboardActionId.SCHEDULE_MEETING,
    titleId: "meeting.dashboard.action.scheduleMeeting.title",
    descriptionId: "meeting.dashboard.action.scheduleMeeting.description",
    tone: MeetingDashboardTone.VIOLET,
    enabled: false,
  },
  {
    id: MeetingDashboardActionId.VIEW_RECORDINGS,
    titleId: "meeting.dashboard.action.viewRecordings.title",
    descriptionId: "meeting.dashboard.action.viewRecordings.description",
    tone: MeetingDashboardTone.AMBER,
    enabled: false,
  },
] as const;

export const meetingNavIconById = {
  [MeetingDashboardNavItemId.OVERVIEW]: Video,
  [MeetingDashboardNavItemId.UPCOMING]: CalendarDays,
  [MeetingDashboardNavItemId.PREVIOUS]: History,
  [MeetingDashboardNavItemId.RECORDINGS]: Radio,
  [MeetingDashboardNavItemId.PERSONAL_ROOM]: Plus,
} as const;


export const meetingActionIconById = {
  [MeetingDashboardActionId.NEW_MEETING]: Plus,
  [MeetingDashboardActionId.JOIN_MEETING]: UserRoundPlus,
  [MeetingDashboardActionId.SCHEDULE_MEETING]: CalendarDays,
  [MeetingDashboardActionId.VIEW_RECORDINGS]: Video,
} as const;

export const meetingActionToneClassByTone = {
  [MeetingDashboardTone.PRIMARY]: "bg-[#0052CC]",
  [MeetingDashboardTone.BLUE]: "bg-[#0C66E4]",
  [MeetingDashboardTone.VIOLET]: "bg-violet-600",
  [MeetingDashboardTone.AMBER]: "bg-amber-500",
} as const;
