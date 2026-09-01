import {
  CalendarDays,
  History,
  Mic,
  MessageSquareText,
  MonitorUp,
  Plus,
  Radio,
  Settings,
  UserRoundPlus,
  UsersRound,
  Video,
} from "lucide-react";
import { MeetingRoomPanel, MeetingRoomSetting } from "./meeting.types";

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

export const meetingRoomSettings = [
  {
    id: MeetingRoomSetting.AUTO_ADMIN,
    labelId: "meeting.prejoin.roomSettings.autoAdmin",
    descriptionId: "meeting.prejoin.roomSettings.autoAdminDescription",
  },
] as const;

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
    id: "share",
    labelId: "meeting.room.control.share",
    icon: MonitorUp,
  },
  {
    id: MeetingRoomPanel.SETTINGS,
    labelId: "meeting.room.control.settings",
    icon: Settings,
  },
] as const;

export const meetingMockParticipants = [
  {
    id: "local-user",
    nameId: "meeting.room.participant.you",
    roleId: "meeting.room.participant.host",
    initials: "YU",
  },
  {
    id: "design-lead",
    nameId: "meeting.room.participant.designLead",
    roleId: "meeting.room.participant.guest",
    initials: "DL",
  },
  {
    id: "backend-lead",
    nameId: "meeting.room.participant.backendLead",
    roleId: "meeting.room.participant.guest",
    initials: "BE",
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
