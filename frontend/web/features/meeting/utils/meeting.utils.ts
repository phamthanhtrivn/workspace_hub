import { meetingRoutes } from "../types/meeting.constants";
import {
  ApiResponse,
  MeetingParticipantStatus,
  MeetingResponse,
} from "../types/meeting.types";

export function normalizeMeetingResponse<T>(payload: unknown): ApiResponse<T> {
  const responsePayload =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  const data =
    typeof payload === "object" && payload !== null && "data" in payload
      ? (payload as { data: unknown }).data
      : payload;

  return {
    ...responsePayload,
    data: data as T,
  };
}

export function resolveMeetingJoinUrl(meeting: MeetingResponse) {
  return meeting.joinUrl || meetingRoutes.joinUrl(meeting.joinToken);
}

export function isMeetingHost(meeting: MeetingResponse, userId?: string | null) {
  return Boolean(userId && meeting.hostId === userId);
}

export function getMeetingParticipantStatus(meeting?: MeetingResponse | null) {
  return meeting?.currentParticipant?.status ?? null;
}

export function canRequestMeetingJoin(meeting?: MeetingResponse | null) {
  const status = getMeetingParticipantStatus(meeting);
  return (
    !status ||
    status === MeetingParticipantStatus.REJECTED ||
    status === MeetingParticipantStatus.LEFT ||
    status === MeetingParticipantStatus.REMOVED
  );
}

export function stopPreviewStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
