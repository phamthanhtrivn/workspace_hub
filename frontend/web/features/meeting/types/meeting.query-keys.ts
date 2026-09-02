export const meetingKeys = {
  room: (joinToken: string) => ["meeting-room", joinToken] as const,
};
