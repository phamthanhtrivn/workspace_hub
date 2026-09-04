import type { Participant } from "livekit-client";
import { ConnectionState } from "livekit-client";
import { MeetingPreJoinSettings, MeetingRoomPanel, ParticipantMetadata } from "../types/meeting.types";

export function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];

  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export function getInitials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return letters || "U";
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

export function getRoleLabelId(role?: string) {
  return role === "HOST"
    ? "meeting.room.participant.host"
    : "meeting.room.participant.guest";
}

export function getRoomStatusLabelId(connectionState: ConnectionState) {
  if (connectionState === ConnectionState.Connected) {
    return "meeting.room.statusConnected";
  }

  if (connectionState === ConnectionState.Reconnecting) {
    return "meeting.room.statusReconnecting";
  }

  return "meeting.room.statusConnecting";
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

export function getPanelTitleLabelId(activePanel: MeetingRoomPanel) {
  if (activePanel === MeetingRoomPanel.PARTICIPANTS) {
    return "meeting.room.panel.participants";
  }

  if (activePanel === MeetingRoomPanel.CHAT) {
    return "meeting.room.panel.chat";
  }

  if (activePanel === MeetingRoomPanel.ADMISSION) {
    return "meeting.room.panel.admission";
  }

  return "meeting.room.panel.settings";
}

export function canManageMeetingAdmission(role?: string) {
  return role === "HOST" || role === "COHOST";
}
