import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

export const SESSION_AUTHORIZATION_PATH =
  '/api/users/internal/sessions/authorize';
export interface SessionIdentity {
  sub: string;
  sid: string;
  exp: number;
}
export async function assertActiveSession(
  identity: SessionIdentity,
): Promise<void> {
  const baseUrl = process.env.USER_SERVICE_URL;
  const key = process.env.INTERNAL_SERVICE_KEY;
  if (!baseUrl || !key?.trim())
    throw new ServiceUnavailableException(
      'Session authorization is not configured',
    );
  let response: Response;
  try {
    response = await fetch(new URL(SESSION_AUTHORIZATION_PATH, baseUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-service-key': key,
      },
      body: JSON.stringify({ userId: identity.sub, sessionId: identity.sid }),
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });
  } catch {
    throw new ServiceUnavailableException('Session authorization unavailable');
  }
  if (!response.ok)
    throw new ServiceUnavailableException('Session authorization unavailable');
  const result = (await response.json()) as { active?: unknown };
  if (result.active !== true || identity.exp * 1000 <= Date.now())
    throw new UnauthorizedException('Session is no longer active');
}
