import type {
  MeetingEndedResponse,
  MeetingChatNotificationPreferenceResponse,
  MeetingJoinRequestStatusResponse,
  MeetingMessageResponse,
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
  MESSAGE_SENT = "meeting:message_sent",
  MESSAGE_UPDATED = "meeting:message_updated",
  MESSAGE_READ = "meeting:message_read",
  CHAT_NOTIFICATION_PREFERENCE_UPDATED = "meeting:chat_notification_preference_updated",
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
export type MeetingChatNotificationPreferenceUpdatedPayload =
  MeetingChatNotificationPreferenceResponse;

export interface MeetingMessageReadPayload {
  meetingId: string;
  joinToken: string;
  messageId: string;
  userId: string;
  readAt: string;
}

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
  [MeetingSocketEvent.MESSAGE_SENT]: (payload: MeetingMessageResponse) => void;
  [MeetingSocketEvent.MESSAGE_UPDATED]: (payload: MeetingMessageResponse) => void;
  [MeetingSocketEvent.MESSAGE_READ]: (payload: MeetingMessageReadPayload) => void;
  [MeetingSocketEvent.CHAT_NOTIFICATION_PREFERENCE_UPDATED]: (
    payload: MeetingChatNotificationPreferenceUpdatedPayload,
  ) => void;
}

export interface ClientToServerMeetingEvents {
  [MeetingSocketEvent.JOIN]: (payload: JoinMeetingSocketPayload) => void;
}
