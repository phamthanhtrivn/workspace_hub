import type {
  MeetingJoinRequestStatusResponse,
  MeetingParticipantStatus,
} from "./meeting.types";

export enum MeetingSocketEvent {
  JOIN = "meeting:join",
  STATUS_UPDATED = "meeting:status_updated",
  JOIN_REQUESTED = "meeting:join_requested",
  JOIN_REQUEST_UPDATED = "meeting:join_request_updated",
}

export interface MeetingStatusUpdatedPayload {
  meetingId: string;
  joinToken: string;
  autoAdmit: boolean;
}

export interface MeetingJoinRequestUpdatedPayload
  extends MeetingJoinRequestStatusResponse {
  meetingId: string;
  userId: string;
  status: MeetingParticipantStatus;
}

