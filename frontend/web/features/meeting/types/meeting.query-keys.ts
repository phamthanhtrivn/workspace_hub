export const meetingKeys = {
  access: (joinToken: string) => ["meeting-access", joinToken] as const,
  room: (joinToken: string) => ["meeting-room", joinToken] as const,
};
