export enum MeetingApiRoute {
  ROOT = "/api/meetings",
  INSTANT = "/api/meetings/instant",
}

export const meetingApiRoutes = {
  joinInfo: (joinToken: string) => `${MeetingApiRoute.ROOT}/join/${joinToken}`,
  joinRequests: (meetingId: string) =>
    `${MeetingApiRoute.ROOT}/${meetingId}/join-requests`,
  approveJoinRequest: (meetingId: string, userId: string) =>
    `${MeetingApiRoute.ROOT}/${meetingId}/join-requests/${userId}/approve`,
  rejectJoinRequest: (meetingId: string, userId: string) =>
    `${MeetingApiRoute.ROOT}/${meetingId}/join-requests/${userId}/reject`,
  access: (meetingId: string) => `${MeetingApiRoute.ROOT}/${meetingId}/access`,
  participants: (meetingId: string) =>
    `${MeetingApiRoute.ROOT}/${meetingId}/participants`,
  participantRole: (meetingId: string, userId: string) =>
    `${MeetingApiRoute.ROOT}/${meetingId}/participants/${userId}/role`,
  removeParticipant: (meetingId: string, userId: string) =>
    `${MeetingApiRoute.ROOT}/${meetingId}/participants/${userId}/remove`,
  leave: (meetingId: string) => `${MeetingApiRoute.ROOT}/${meetingId}/leave`,
  end: (meetingId: string) => `${MeetingApiRoute.ROOT}/${meetingId}/end`,
  liveKitToken: (meetingId: string) =>
    `${MeetingApiRoute.ROOT}/${meetingId}/livekit-token`,
};
