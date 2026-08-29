import type { Socket } from "socket.io-client";
import type {
  ClientToServerChatEvents,
  ServerToClientChatEvents,
} from "@/features/chat/types/chat-socket.types";
import { MeetingSocketEvent } from "@/features/meeting/api/meeting-socket.events";
import type { MeetingSocketPayload } from "@/features/meeting/types/meeting.types";

export interface ServerToClientMeetingEvents {
  [MeetingSocketEvent.JOIN_REQUESTED]: (payload: MeetingSocketPayload) => void;
  [MeetingSocketEvent.JOIN_APPROVED]: (payload: MeetingSocketPayload) => void;
  [MeetingSocketEvent.JOIN_REJECTED]: (payload: MeetingSocketPayload) => void;
  [MeetingSocketEvent.ACCESS_UPDATED]: (payload: MeetingSocketPayload) => void;
  [MeetingSocketEvent.PARTICIPANT_LEFT]: (
    payload: MeetingSocketPayload,
  ) => void;
  [MeetingSocketEvent.PARTICIPANT_ROLE_UPDATED]: (
    payload: MeetingSocketPayload,
  ) => void;
  [MeetingSocketEvent.PARTICIPANT_REMOVED]: (
    payload: MeetingSocketPayload,
  ) => void;
  [MeetingSocketEvent.MEETING_ENDED]: (payload: MeetingSocketPayload) => void;
}

export interface ClientToServerMeetingEvents {
  [MeetingSocketEvent.JOIN_CONTROL_ROOM]: (
    payload: { meetingId: string },
  ) => void;
  [MeetingSocketEvent.LEAVE_CONTROL_ROOM]: (
    payload: { meetingId: string },
  ) => void;
}

export interface CommunicationServerToClientEvents
  extends ServerToClientChatEvents,
    ServerToClientMeetingEvents {}

export interface CommunicationClientToServerEvents
  extends ClientToServerChatEvents,
    ClientToServerMeetingEvents {}

export type CommunicationSocket = Socket<
  CommunicationServerToClientEvents,
  CommunicationClientToServerEvents
>;
