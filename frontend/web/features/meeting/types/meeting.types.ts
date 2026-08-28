export enum MeetingType {
  INSTANT = "INSTANT",
  SCHEDULED = "SCHEDULED",
}

export enum MeetingStatus {
  SCHEDULED = "SCHEDULED",
  LIVE = "LIVE",
  ENDED = "ENDED",
  CANCELLED = "CANCELLED",
}

export enum MeetingRole {
  HOST = "HOST",
  COHOST = "COHOST",
  PARTICIPANT = "PARTICIPANT",
}

export enum MeetingParticipantStatus {
  INVITED = "INVITED",
  REQUESTED = "REQUESTED",
  JOINED = "JOINED",
  LEFT = "LEFT",
  REMOVED = "REMOVED",
  REJECTED = "REJECTED",
}

export interface ApiResponse<T> {
  message?: string;
  data: T;
}

export interface UserProfileSnapshot {
  id: string;
  userId: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  role: MeetingRole;
  status: MeetingParticipantStatus;
  invitedAt?: string | null;
  joinedAt?: string | null;
  leftAt?: string | null;
  lastSeenAt?: string | null;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfileSnapshot | null;
}

export interface MeetingResponse {
  id: string;
  roomName: string;
  joinToken: string;
  joinUrl: string;
  description?: string | null;
  type: MeetingType;
  status: MeetingStatus;
  createdBy: string;
  hostId: string;
  startedAt?: string | null;
  endedAt?: string | null;
  allowJoinWithoutApproval: boolean;
  createdAt: string;
  updatedAt: string;
  currentParticipant?: MeetingParticipant | null;
  participants?: MeetingParticipant[];
  pendingJoinRequestCount?: number;
}

export interface CreateInstantMeetingRequest {
  allowJoinWithoutApproval?: boolean;
}

export interface UpdateMeetingAccessRequest {
  allowJoinWithoutApproval: boolean;
}

export interface RequestJoinMeetingResponse {
  meeting: MeetingResponse;
  participant: MeetingParticipant;
}

export interface MeetingLiveKitTokenResponse {
  serverUrl: string;
  token: string;
  roomName: string;
}

export interface MeetingDevicePreferences {
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
  cameraDeviceId?: string;
  micDeviceId?: string;
}

export interface MeetingSocketPayload {
  meetingId: string;
  userId?: string;
  participant?: MeetingParticipant;
  allowJoinWithoutApproval?: boolean;
}
