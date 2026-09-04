export enum MeetingFlowStep {
  DASHBOARD = "dashboard",
  PREJOIN = "prejoin",
  CREATING = "creating",
}

export enum MeetingPreJoinMode {
  CREATE = "create",
  JOIN = "join",
}

export enum MeetingJoinFlowStep {
  CHECKING = "checking",
  PREJOIN = "prejoin",
  WAITING_APPROVAL = "waiting-approval",
  JOINING = "joining",
  ROOM = "room",
  ERROR = "error",
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

export enum MeetingParticipantStatusValue {
  INVITED = "INVITED",
  REQUESTED = "REQUESTED",
  APPROVED = "APPROVED",
  JOINED = "JOINED",
  LEFT = "LEFT",
  REMOVED = "REMOVED",
  REJECTED = "REJECTED",
}

export type MeetingParticipantStatus =
  | "INVITED"
  | "REQUESTED"
  | "APPROVED"
  | "JOINED"
  | "LEFT"
  | "REMOVED"
  | "REJECTED";

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

export interface MeetingAccessResponse {
  meetingId: string;
  joinToken: string;
  status: "LIVE";
  autoAdmit: boolean;
  canJoinWithoutApproval: boolean;
  participantRole: MeetingParticipantRole;
  participantStatus: MeetingParticipantStatus | null;
}

export type JoinMeetingPayload = Pick<
  CreateInstantMeetingPayload,
  "deviceSettings"
>;

export enum MeetingRoomPanel {
  NONE = "none",
  PARTICIPANTS = "participants",
  CHAT = "chat",
  ADMISSION = "admission",
  SETTINGS = "settings",
}

export interface MeetingRoomSidePanelProps {
  activePanel: MeetingRoomPanel;
  joinToken: string;
  meetingId: string;
  participantRole: MeetingParticipantRole;
  participantCount: number;
  autoAdmit: boolean;
  onAutoAdmitChange: (autoAdmit: boolean) => void;
  onClose: () => void;
}

export type MeetingRoomPanelContentProps = Pick<
  MeetingRoomSidePanelProps,
  | "activePanel"
  | "joinToken"
  | "meetingId"
  | "participantRole"
  | "participantCount"
  | "autoAdmit"
  | "onAutoAdmitChange"
>;

export type MeetingRoomSettingsPanelProps = Pick<
  MeetingRoomSidePanelProps,
  | "joinToken"
  | "participantRole"
  | "participantCount"
  | "autoAdmit"
  | "onAutoAdmitChange"
>;

export interface ParticipantMetadata {
  role?: string;
  avatarUrl?: string | null;
}

export interface MeetingJoinRequestResponse {
  id: string;
  meetingId: string;
  userId: string;
  role: MeetingParticipantRole;
  status: MeetingParticipantStatus;
  requestedAt: string;
  profile: {
    id?: string | null;
    userId?: string | null;
    email: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface MeetingJoinRequestsResponse {
  items: MeetingJoinRequestResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MeetingJoinRequestStatusResponse {
  meetingId: string;
  joinToken?: string;
  userId?: string;
  participantStatus?: MeetingParticipantStatus;
  status?: MeetingParticipantStatus;
  requestedAt?: string;
}

export interface MeetingSettingsResponse {
  meetingId: string;
  joinToken: string;
  autoAdmit: boolean;
}
