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

export enum MeetingRoomSetting {
  AUTO_ADMIN = "auto-admin",
}

export enum MeetingRoomPanel {
  NONE = "none",
  PARTICIPANTS = "participants",
  CHAT = "chat",
  SETTINGS = "settings",
}
