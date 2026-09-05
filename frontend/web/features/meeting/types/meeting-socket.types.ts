import type {
  MeetingEndedResponse,
  MeetingJoinRequestStatusResponse,
  MeetingParticipantResponse,
  MeetingParticipantStatus,
} from "./meeting.types";

export enum MeetingSocketEvent {
  JOIN = "meeting:join",
  PARTICIPANT_JOINED = "meeting:participant_joined",
  PARTICIPANT_LEFT = "meeting:participant_left",
  PARTICIPANT_UPDATED = "meeting:participant_updated",
  PARTICIPANT_REMOVED = "meeting:participant_removed",
  HOST_TRANSFERRED = "meeting:host_transferred",
  STATUS_UPDATED = "meeting:status_updated",
  ENDED = "meeting:ended",
  JOIN_REQUESTED = "meeting:join_requested",
  JOIN_REQUEST_UPDATED = "meeting:join_request_updated",
}

export interface MeetingStatusUpdatedPayload {
  meetingId: string;
  joinToken: string;
  status?: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  autoAdmit: boolean;
  endedBy?: string;
  endedAt?: string;
}

export interface MeetingJoinRequestUpdatedPayload
  extends MeetingJoinRequestStatusResponse {
  meetingId: string;
  userId: string;
  status: MeetingParticipantStatus;
}

export interface JoinMeetingSocketPayload {
  meetingId: string;
}

export interface MeetingHostTransferredPayload {
  meetingId: string;
  joinToken: string;
  previousHostId: string;
  hostId: string;
  targetUserId: string;
}

export type MeetingParticipantUpdatedPayload = MeetingParticipantResponse;
export type MeetingParticipantJoinedPayload = MeetingParticipantResponse;
export type MeetingParticipantLeftPayload = MeetingParticipantResponse;
export type MeetingParticipantRemovedPayload = MeetingParticipantResponse;
export type MeetingEndedPayload = MeetingEndedResponse;

export interface ServerToClientMeetingEvents {
  [MeetingSocketEvent.PARTICIPANT_JOINED]: (
    payload: MeetingParticipantJoinedPayload,
  ) => void;
  [MeetingSocketEvent.PARTICIPANT_LEFT]: (
    payload: MeetingParticipantLeftPayload,
  ) => void;
  [MeetingSocketEvent.PARTICIPANT_UPDATED]: (
    payload: MeetingParticipantUpdatedPayload,
  ) => void;
  [MeetingSocketEvent.PARTICIPANT_REMOVED]: (
    payload: MeetingParticipantRemovedPayload,
  ) => void;
  [MeetingSocketEvent.HOST_TRANSFERRED]: (
    payload: MeetingHostTransferredPayload,
  ) => void;
  [MeetingSocketEvent.STATUS_UPDATED]: (
    payload: MeetingStatusUpdatedPayload,
  ) => void;
  [MeetingSocketEvent.ENDED]: (payload: MeetingEndedPayload) => void;
  [MeetingSocketEvent.JOIN_REQUESTED]: (
    payload: MeetingJoinRequestUpdatedPayload,
  ) => void;
  [MeetingSocketEvent.JOIN_REQUEST_UPDATED]: (
    payload: MeetingJoinRequestUpdatedPayload,
  ) => void;
}

export interface ClientToServerMeetingEvents {
  [MeetingSocketEvent.JOIN]: (payload: JoinMeetingSocketPayload) => void;
}
