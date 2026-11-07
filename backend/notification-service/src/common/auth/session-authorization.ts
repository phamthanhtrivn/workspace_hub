import { SESSION_AUTH_CODE, SessionAuthError } from "./session-errors";

export const SESSION_AUTHORIZATION_PATH =
  "/api/users/internal/sessions/authorize";
const AUTHORIZATION_TIMEOUT_MS = 5_000;
export interface SessionIdentity {
  sub: string;
  sid: string;
  exp: number;
}
export async function assertActiveSession(
  identity: SessionIdentity,
): Promise<void> {
  // Only identities verified by the JWT verifier reach this boundary.
  if (identity.exp * 1000 <= Date.now())
    throw new SessionAuthError(SESSION_AUTH_CODE.TOKEN_EXPIRED);
  const baseUrl = process.env.USER_SERVICE_URL;
  const key = process.env.NOTIFICATION_TO_USER_KEY;
  if (!baseUrl || !key?.trim())
    throw new SessionAuthError(SESSION_AUTH_CODE.AUTH_CONFIGURATION_ERROR);
  let url: URL;
  try {
    url = new URL(SESSION_AUTHORIZATION_PATH, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      throw new Error("Invalid authorization protocol");
  } catch {
    throw new SessionAuthError(SESSION_AUTH_CODE.AUTH_CONFIGURATION_ERROR);
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-service-key": key,
      },
      body: JSON.stringify({ userId: identity.sub, sessionId: identity.sid }),
      signal: AbortSignal.timeout(AUTHORIZATION_TIMEOUT_MS),
      redirect: "error",
    });
  } catch {
    throw new SessionAuthError(SESSION_AUTH_CODE.AUTH_SERVICE_UNAVAILABLE);
  }
  if (response.status === 401 || response.status === 403)
    throw new SessionAuthError(SESSION_AUTH_CODE.AUTH_CONFIGURATION_ERROR);
  if (!response.ok)
    throw new SessionAuthError(SESSION_AUTH_CODE.AUTH_SERVICE_UNAVAILABLE);
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new SessionAuthError(SESSION_AUTH_CODE.AUTH_SERVICE_UNAVAILABLE);
  }
  if (
    !result ||
    typeof result !== "object" ||
    !("active" in result) ||
    typeof result.active !== "boolean"
  ) {
    throw new SessionAuthError(SESSION_AUTH_CODE.AUTH_SERVICE_UNAVAILABLE);
  }
  if (!result.active)
    throw new SessionAuthError(SESSION_AUTH_CODE.SESSION_REVOKED);
}
