export const SOCKET_SESSION = {
  revocationChannel: 'workspacehub:session-revoked',
  pollMilliseconds: 1000,
  sessionRoom: (sessionId: string) => 'session:' + sessionId,
  userRoom: (userId: string) => 'identity-user:' + userId,
} as const;
