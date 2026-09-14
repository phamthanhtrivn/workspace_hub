import { ConnectionState } from "livekit-client";
import {
  MEETING_STATUS,
  MeetingDashboardActionId,
  MeetingDashboardNavItemId,
} from "../types/meeting.constants";
import {
  MEETING_ROLE,
  MeetingRoomPanel,
  type MeetingParticipantRole,
  type MeetingStatus,
} from "../types/meeting.types";

export function getMeetingDashboardNavLabel(id: MeetingDashboardNavItemId) {
  if (id === MeetingDashboardNavItemId.OVERVIEW) return "Overview";
  if (id === MeetingDashboardNavItemId.UPCOMING) return "Upcoming";
  if (id === MeetingDashboardNavItemId.PREVIOUS) return "Previous";
  if (id === MeetingDashboardNavItemId.RECORDINGS) return "Recordings";
  return "Personal room";
}

export function getMeetingDashboardActionCopy(id: MeetingDashboardActionId) {
  if (id === MeetingDashboardActionId.NEW_MEETING) {
    return {
      title: "New meeting",
      description: "Start an instant meeting",
    };
  }

  if (id === MeetingDashboardActionId.JOIN_MEETING) {
    return {
      title: "Join meeting",
      description: "Use an invitation link",
    };
  }

  if (id === MeetingDashboardActionId.SCHEDULE_MEETING) {
    return {
      title: "Schedule meeting",
      description: "Plan a meeting ahead",
    };
  }

  return {
    title: "View recordings",
    description: "Browse saved sessions",
  };
}

export function getMeetingStatusLabel(status: MeetingStatus | MEETING_STATUS) {
  if (status === MEETING_STATUS.SCHEDULED) return "Scheduled";
  if (status === MEETING_STATUS.LIVE) return "Live";
  if (status === MEETING_STATUS.ENDED) return "Ended";
  return "Cancelled";
}

export function getMeetingTypeLabel(type: string) {
  return type === "SCHEDULED" ? "Scheduled Meeting" : "Instant Meeting";
}

export function getRoleLabel(role?: MeetingParticipantRole | string) {
  if (role === MEETING_ROLE.HOST) return "Host";
  if (role === MEETING_ROLE.COHOST) return "Co-host";

  return null;
}

export function getRoomStatusLabel(connectionState: ConnectionState) {
  if (connectionState === ConnectionState.Connected) return "Connected";
  if (connectionState === ConnectionState.Reconnecting) return "Reconnecting";

  return "Connecting";
}

export function getPanelTitle(activePanel: MeetingRoomPanel) {
  if (activePanel === MeetingRoomPanel.PARTICIPANTS) return "Participants";
  if (activePanel === MeetingRoomPanel.CHAT) return "Meeting chat";
  if (activePanel === MeetingRoomPanel.ADMISSION) return "Admission";

  return "Room settings";
}
