/** Transient cancellation scopes, owned by the mounted room (never persisted). */
const scopes = new Map<string, AbortController>();
const CLOSED_SCOPE_LIMIT = 32;

export function openMeetingRoomRequests(joinToken: string, meetingId?: string): () => void {
  const previous = scopes.get(joinToken);
  previous?.abort();
  const controller = new AbortController();
  scopes.delete(joinToken);
  scopes.set(joinToken, controller);
  if (meetingId) scopes.set(meetingId, controller);
  const closed = [...scopes].filter(([, scope]) => scope.signal.aborted);
  for (const [token] of closed.slice(
    0,
    Math.max(0, closed.length - CLOSED_SCOPE_LIMIT),
  ))
    scopes.delete(token);
  return () => controller.abort();
}

export function closeMeetingRoomRequests(joinToken: string): void {
  scopes.get(joinToken)?.abort();
}

export function isMeetingRoomClosing(joinToken: string): boolean {
  return scopes.get(joinToken)?.signal.aborted ?? false;
}

export function meetingRoomSignal(roomKey: string): AbortSignal | undefined {
  return scopes.get(roomKey)?.signal;
}

export function meetingRoomRequestSignal(
  url: string,
  method = "GET",
): AbortSignal | undefined {
  const parts = new URL(url, "https://meeting-request.invalid").pathname.split(
    "/",
  );
  if (parts[1] !== "api" || parts[2] !== "meetings" || !parts[3]) return;
  // Access/join and scheduling remain usable outside a mounted room, including rejoin.
  if (
    !parts[4] ||
    ["access", "join", "start", "schedule", "cancel", "invitations"].includes(
      parts[4],
    )
  )
    return;
  if (parts[4] === "join-requests" && parts.length === 5 && method === "POST")
    return;
  let token: string;
  try {
    token = decodeURIComponent(parts[3]);
  } catch {
    return;
  }
  return scopes.get(token)?.signal;
}
