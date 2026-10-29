const JOIN_TOKEN_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;

/**
 * Extracts a meeting joinToken from a location string if it represents a Workspace Hub meeting URL.
 * Accepts same-origin meeting URLs and relative /meetings/:token links.
 */
export function parseCalendarMeetingJoinToken(
  location?: string | null,
): string | null {
  if (!location) return null;
  const trimmed = location.trim();
  if (!trimmed) return null;

  // URL matching /meetings/:joinToken
  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const url = new URL(trimmed, origin);
    if (url.origin !== origin) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    const meetingIdx = segments.indexOf("meetings");
    if (meetingIdx !== -1 && segments[meetingIdx + 1]) {
      const token = decodeURIComponent(segments[meetingIdx + 1]);
      if (JOIN_TOKEN_PATTERN.test(token)) {
        return token;
      }
    }
  } catch {
    // If not a valid URL, return null
  }

  return null;
}

export function isWorkspaceMeetingUrl(location?: string | null): boolean {
  return Boolean(parseCalendarMeetingJoinToken(location));
}

export function buildCalendarMeetingUrl(joinToken: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  return `${origin}/meetings/${joinToken}`;
}
