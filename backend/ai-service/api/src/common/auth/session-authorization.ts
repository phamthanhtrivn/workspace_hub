import {
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { internalPost } from "../../infrastructure/integrations/internal-http";
import { config } from "../../config/env.config";

export const SESSION_AUTHORIZATION_PATH =
  "/api/users/internal/sessions/authorize";
export interface SessionIdentity {
  sub: string;
  sid: string;
  exp: number;
}
export async function assertActiveSession(
  identity: SessionIdentity,
): Promise<void> {
  const baseUrl = config.USER_SERVICE_URL;
  const key = config.AI_TO_USER_KEY;
  if (!baseUrl || !key?.trim())
    throw new ServiceUnavailableException(
      "Session authorization is not configured",
    );
  let response: Response;
  try {
    response = await internalPost(
      new URL(SESSION_AUTHORIZATION_PATH, baseUrl).toString(),
      {
        key,
        body: { userId: identity.sub, sessionId: identity.sid },
        timeoutMs: 5000,
      },
    );
  } catch {
    throw new ServiceUnavailableException("Session authorization unavailable");
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new ServiceUnavailableException("Session authorization unavailable");
  }
  const result = (await response.json()) as { active?: unknown };
  if (result.active !== true || identity.exp * 1000 <= Date.now())
    throw new UnauthorizedException("Session is no longer active");
}
