import { MeetingParticipantStatus } from "../types/meeting.types";

export const joinedMeetingStatuses = new Set<MeetingParticipantStatus>([
  MeetingParticipantStatus.JOINED,
]);
