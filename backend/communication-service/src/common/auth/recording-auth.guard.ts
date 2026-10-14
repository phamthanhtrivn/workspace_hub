import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { recordingError } from '../../modules/meeting/utils/meeting-recording.utils';

interface UserClaims {
  sub?: unknown;
  exp?: unknown;
  nbf?: unknown;
  iss?: unknown;
  role?: unknown;
}

export function verifyRecordingUserToken(token: string): string {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret)
    recordingError(
      503,
      'AUTH_NOT_CONFIGURED',
      'User authentication is not configured',
    );
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || token.length > 16_384)
      throw new Error('Invalid token');
    const header = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString(),
    ) as { alg?: unknown };
    if (header.alg !== 'HS256') throw new Error('Unsupported algorithm');
    const expected = createHmac('sha256', secret)
      .update(`${parts[0]}.${parts[1]}`)
      .digest();
    const signature = Buffer.from(parts[2], 'base64url');
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)
    )
      throw new Error('Invalid signature');
    const claims = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString(),
    ) as UserClaims;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof claims.exp !== 'number' ||
      claims.exp <= now ||
      !Number.isFinite(claims.exp)
    )
      throw new Error('Expired token');
    if (
      claims.nbf !== undefined &&
      (typeof claims.nbf !== 'number' || claims.nbf > now)
    )
      throw new Error('Token not active');
    if (claims.iss !== (process.env.JWT_ISSUER || 'workspace-hub'))
      throw new Error('Invalid issuer');
    if (claims.role === 'RESET_PASSWORD_ROLE')
      throw new Error('Password reset token');
    if (
      typeof claims.sub !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        claims.sub,
      )
    )
      throw new Error('Invalid subject');
    return claims.sub;
  } catch {
    recordingError(401, 'UNAUTHENTICATED', 'A valid access token is required');
  }
}

@Injectable()
export class RecordingAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer '))
      recordingError(401, 'UNAUTHENTICATED', 'Authentication is required');
    request.headers['x-user-id'] = verifyRecordingUserToken(
      authorization.slice(7),
    );
    return true;
  }
}
