import type { Participant } from "livekit-client";
import { ConnectionState } from "livekit-client";
import {
  MEETING_ROLE,
  MeetingParticipantRole,
  MeetingParticipantStatusValue,
  type MeetingAccessResponse,
  MeetingPreJoinSettings,
  MeetingRoomPanel,
  ParticipantMetadata,
} from "../types/meeting.types";

export function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];

  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export function parseParticipantMetadata(
  participant: Participant,
): ParticipantMetadata {
  if (!participant.metadata) return {};

  try {
    return JSON.parse(participant.metadata) as ParticipantMetadata;
  } catch {
    return {};
  }
}

export function getRoleLabel(role?: MeetingParticipantRole | string) {
  if (role === MEETING_ROLE.HOST) return "Host";
  if (role === MEETING_ROLE.COHOST) return "Co-host";

  return null;
}

export function getRoomStatusLabel(connectionState: ConnectionState) {
  if (connectionState === ConnectionState.Connected) {
    return "Connected";
  }

  if (connectionState === ConnectionState.Reconnecting) {
    return "Reconnecting";
  }

  return "Connecting";
}

export function getAudioSetting(settings: MeetingPreJoinSettings) {
  if (!settings.microphoneEnabled) return false;

  return {
    deviceId: settings.microphoneDeviceId || undefined,
  };
}

export function getVideoSetting(settings: MeetingPreJoinSettings) {
  if (!settings.cameraEnabled) return false;

  return {
    deviceId: settings.cameraDeviceId || undefined,
  };
}

export function needsMeetingPassword(access?: MeetingAccessResponse | null) {
  if (!access?.requiresPassword || access.canStart) return false;

  return (
    access.participantStatus !== MeetingParticipantStatusValue.JOINED &&
    access.participantStatus !== MeetingParticipantStatusValue.LEFT
  );
}

export function getPanelTitle(activePanel: MeetingRoomPanel) {
  if (activePanel === MeetingRoomPanel.PARTICIPANTS) {
    return "Participants";
  }

  if (activePanel === MeetingRoomPanel.CHAT) {
    return "Meeting chat";
  }

  if (activePanel === MeetingRoomPanel.ADMISSION) {
    return "Admission";
  }

  return "Room settings";
}

export function canManageMeetingAdmission(role?: string) {
  return role === MEETING_ROLE.HOST || role === MEETING_ROLE.COHOST;
}

export function isMeetingHost(role?: MeetingParticipantRole) {
  return role === MEETING_ROLE.HOST;
}

export function canRemoveMeetingParticipant({
  actorRole,
  targetRole,
  isSelf,
}: {
  actorRole?: MeetingParticipantRole;
  targetRole?: MeetingParticipantRole;
  isSelf: boolean;
}) {
  if (isSelf) return false;
  if (actorRole === MEETING_ROLE.HOST) return targetRole !== MEETING_ROLE.HOST;

  return (
    actorRole === MEETING_ROLE.COHOST &&
    targetRole === MEETING_ROLE.PARTICIPANT
  );
}
