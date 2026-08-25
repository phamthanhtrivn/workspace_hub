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
}

export interface MeetingResponse {
  id: string;
  roomName: string;
  joinToken: string;
  joinUrl: string;
  title: string;
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
  title?: string;
  allowJoinWithoutApproval?: boolean;
}

export interface UpdateMeetingAccessRequest {
  allowJoinWithoutApproval: boolean;
}

export interface RequestJoinMeetingResponse {
  meeting: MeetingResponse;
  participant: MeetingParticipant;
}

export interface MeetingSocketPayload {
  meetingId: string;
  userId?: string;
  participant?: MeetingParticipant;
  allowJoinWithoutApproval?: boolean;
}
