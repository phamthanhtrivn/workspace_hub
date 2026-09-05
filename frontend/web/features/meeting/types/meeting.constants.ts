import {
  CalendarDays,
  History,
  Mic,
  MessageSquareText,
  Plus,
  Radio,
  Settings,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
  Video,
} from "lucide-react";
import { MeetingRoomPanel } from "./meeting.types";

export const MEETING_ROUTES = {
  DASHBOARD: "/meetings",
  room: (joinToken: string) => `/meetings/${encodeURIComponent(joinToken)}`,
} as const;

export const MEETING_API_PATHS = {
  INSTANT: "/api/meetings/instant",
  join: (joinToken: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/join`,
  joinRequests: (joinToken: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/join-requests`,
  participants: (joinToken: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/participants`,
  removeParticipant: (joinToken: string, userId: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/participants/${encodeURIComponent(userId)}/remove`,
  updateParticipantRole: (joinToken: string, userId: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/participants/${encodeURIComponent(userId)}/role`,
  leave: (joinToken: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/leave`,
  end: (joinToken: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/end`,
  approveJoinRequest: (joinToken: string, userId: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/join-requests/${encodeURIComponent(userId)}/approve`,
  declineJoinRequest: (joinToken: string, userId: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/join-requests/${encodeURIComponent(userId)}/decline`,
  approveAllJoinRequests: (joinToken: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/join-requests/approve-all`,
  declineAllJoinRequests: (joinToken: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/join-requests/decline-all`,
  settings: (joinToken: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/settings`,
  access: (joinToken: string) =>
    `/api/meetings/${encodeURIComponent(joinToken)}/access`,
} as const;

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

export const meetingRoomControlItems = [
  {
    id: "microphone",
    labelId: "meeting.room.control.microphone",
    icon: Mic,
  },
  {
    id: "camera",
    labelId: "meeting.room.control.camera",
    icon: Video,
  },
  {
    id: MeetingRoomPanel.PARTICIPANTS,
    labelId: "meeting.room.control.participants",
    icon: UsersRound,
  },
  {
    id: MeetingRoomPanel.CHAT,
    labelId: "meeting.room.control.chat",
    icon: MessageSquareText,
  },
  {
    id: MeetingRoomPanel.ADMISSION,
    labelId: "meeting.room.control.admission",
    icon: ShieldCheck,
  },
  {
    id: MeetingRoomPanel.SETTINGS,
    labelId: "meeting.room.control.settings",
    icon: Settings,
  },
] as const;

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

export const MIN_VISIBLE_BADGE_COUNT = 1;
export const MAX_BADGE_COUNT = 99;
export const OVERFLOW_BADGE_LABEL = "99+";
