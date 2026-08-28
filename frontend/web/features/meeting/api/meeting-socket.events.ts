export enum MeetingSocketEvent {
  JOIN_CONTROL_ROOM = "meeting:join-control-room",
  JOIN_REQUESTED = "meeting:join-requested",
  JOIN_APPROVED = "meeting:join-approved",
  JOIN_REJECTED = "meeting:join-rejected",
  ACCESS_UPDATED = "meeting:access-updated",
  PARTICIPANT_LEFT = "meeting:participant-left",
  PARTICIPANT_ROLE_UPDATED = "meeting:participant-role-updated",
  PARTICIPANT_REMOVED = "meeting:participant-removed",
  MEETING_ENDED = "meeting:ended",
}
