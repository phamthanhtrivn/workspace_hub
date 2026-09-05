export const meetingKeys = {
  access: (joinToken: string) => ["meeting-access", joinToken] as const,
  joinRequestCount: (joinToken: string) =>
    ["meeting-join-requests", joinToken, "count"] as const,
  joinRequestsRoot: (joinToken: string) =>
    ["meeting-join-requests", joinToken] as const,
  joinRequests: (joinToken: string, search: string, page: number) =>
    ["meeting-join-requests", joinToken, search, page] as const,
  participantsRoot: (joinToken: string) =>
    ["meeting-participants", joinToken] as const,
  participants: (joinToken: string, search: string, page: number) =>
    ["meeting-participants", joinToken, search, page] as const,
  messageUnreadCount: (joinToken: string) =>
    ["meeting-messages", joinToken, "unread-count"] as const,
  messages: (joinToken: string) => ["meeting-messages", joinToken] as const,
  room: (joinToken: string) => ["meeting-room", joinToken] as const,
};
