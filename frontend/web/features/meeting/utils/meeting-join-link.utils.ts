const JOIN_TOKEN_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;

function getMeetingPathToken(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const meetingSegmentIndex = segments.indexOf("meetings");
  const encodedJoinToken = segments[meetingSegmentIndex + 1];

  if (meetingSegmentIndex === -1 || !encodedJoinToken) return null;

  try {
    return decodeURIComponent(encodedJoinToken);
  } catch {
    return null;
  }
}

export function parseMeetingJoinToken(
  input: string,
  currentOrigin?: string,
): string | null {
  const value = input.trim();

  if (!value) return null;
  if (JOIN_TOKEN_PATTERN.test(value)) return value;

  try {
    const url = new URL(value, currentOrigin);

    if (currentOrigin && url.origin !== currentOrigin) return null;

    const joinToken = getMeetingPathToken(url.pathname);
    if (!joinToken || !JOIN_TOKEN_PATTERN.test(joinToken)) return null;

    return joinToken;
  } catch {
    return null;
  }
}
