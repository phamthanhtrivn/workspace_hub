import { MeetingParticipant, MeetingRole } from "../../../types/meeting.types";

export function getParticipantName(participant: MeetingParticipant) {
  return (
    participant.profile?.fullName ||
    participant.profile?.email ||
    participant.userId
  );
}

export function getRoleRank(participant: MeetingParticipant, hostId: string) {
  if (participant.userId === hostId || participant.role === MeetingRole.HOST) {
    return 0;
  }
  if (participant.role === MeetingRole.COHOST) {
    return 1;
  }
  return 2;
}
