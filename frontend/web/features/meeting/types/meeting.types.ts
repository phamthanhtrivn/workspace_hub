export enum MeetingFlowStep {
  DASHBOARD = "dashboard",
  PREJOIN = "prejoin",
  CREATING = "creating",
}

export enum MeetingDeviceKind {
  CAMERA = "camera",
  MICROPHONE = "microphone",
}

export interface MeetingDeviceOption {
  deviceId: string;
  label: string;
}

export interface MeetingPreJoinSettings {
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  cameraDeviceId: string;
  microphoneDeviceId: string;
  autoAdmin: boolean;
}

export interface CreateInstantMeetingPayload {
  autoAdmit?: boolean;
  deviceSettings?: {
    cameraEnabled: boolean;
    microphoneEnabled: boolean;
    cameraDeviceId?: string;
    microphoneDeviceId?: string;
  };
}

export type MeetingParticipantRole = "HOST" | "COHOST" | "PARTICIPANT";

export interface InstantMeetingResponse {
  meeting: {
    id: string;
    roomName: string;
    joinToken: string;
    type: "INSTANT";
    status: "LIVE";
    autoAdmit: boolean;
    startedAt: string | null;
    createdAt: string;
    participantRole: MeetingParticipantRole;
  };
  livekit: {
    serverUrl: string;
    token: string;
  };
}

export type JoinMeetingPayload = Pick<
  CreateInstantMeetingPayload,
  "deviceSettings"
>;

export enum MeetingRoomPanel {
  NONE = "none",
  PARTICIPANTS = "participants",
  CHAT = "chat",
  SETTINGS = "settings",
}

export interface MeetingRoomSidePanelProps {
  activePanel: MeetingRoomPanel;
  joinToken: string;
  participantRole: MeetingParticipantRole;
  participantCount: number;
  onClose: () => void;
}

export type MeetingRoomPanelContentProps = Pick<
  MeetingRoomSidePanelProps,
  "activePanel" | "joinToken" | "participantRole" | "participantCount"
>;

export type MeetingRoomSettingsPanelProps = Pick<
  MeetingRoomSidePanelProps,
  "joinToken" | "participantRole" | "participantCount"
>;

export interface ParticipantMetadata {
  role?: string;
  avatarUrl?: string | null;
}
