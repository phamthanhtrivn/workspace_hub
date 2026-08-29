export enum MeetingQueryRoot {
  MEETINGS = "meetings",
  JOIN = "meeting-join",
  REQUESTS = "meeting-join-requests",
  PARTICIPANTS = "meeting-participants",
  LIVEKIT_TOKEN = "meeting-livekit-token",
}

export const meetingKeys = {
  all: [MeetingQueryRoot.MEETINGS] as const,
  join: (joinToken: string) => [MeetingQueryRoot.JOIN, joinToken] as const,
  requests: (meetingId: string) =>
    [MeetingQueryRoot.REQUESTS, meetingId] as const,
  participants: (meetingId: string, search: string) =>
    [MeetingQueryRoot.PARTICIPANTS, meetingId, search] as const,
  participantsRoot: (meetingId: string) =>
    [MeetingQueryRoot.PARTICIPANTS, meetingId] as const,
  liveKitToken: (meetingId: string) =>
    [MeetingQueryRoot.LIVEKIT_TOKEN, meetingId] as const,
};
