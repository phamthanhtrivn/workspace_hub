export interface MeetingJoinRequestPayload {
  meetingId: string;
  userId: string;
  participant: unknown;
}

export interface MeetingJoinDecisionPayload {
  meetingId: string;
  userId: string;
  participant: unknown;
}

export interface MeetingAccessUpdatedPayload {
  meetingId: string;
  allowJoinWithoutApproval: boolean;
}
