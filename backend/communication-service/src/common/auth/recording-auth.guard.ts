import { verifyAccessClaims } from './access-token';
import { assertActiveSession } from './session-authorization';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { recordingError } from '../../modules/meeting/utils/meeting-recording.utils';

export function verifyRecordingUserToken(token: string): string { return verifyAccessClaims(token).sub; }

@Injectable()
export class RecordingAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer '))
      recordingError(401, 'UNAUTHENTICATED', 'Authentication is required');
    const identity = verifyAccessClaims(authorization.slice(7));
    await assertActiveSession(identity);
    request.headers['x-user-id'] = identity.sub;
    return true;
  }
}
