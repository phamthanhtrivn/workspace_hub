import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { isUUID } from 'class-validator';
import { verify } from 'jsonwebtoken';
import type { Request } from 'express';
import { AI_DOCUMENT_MESSAGES } from '../ai-integration.constants';
import type { AiActor } from '../types/ai-document.types';

export type AiRequest = Request & { aiActor: AiActor };

@Injectable()
export class AiDelegationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AiRequest>();
    const expected = process.env.INTERNAL_SERVICE_KEY;
    const supplied = request.header('x-internal-service-key');
    const delegation = request.header('x-ai-delegation');
    try {
      if (!expected || !supplied || !delegation || delegation.length > 16384)
        throw new Error();
      const left = Buffer.from(expected);
      const right = Buffer.from(supplied);
      if (left.length !== right.length || !timingSafeEqual(left, right))
        throw new Error();
      const claims = verify(delegation, expected, {
        algorithms: ['HS256'],
        issuer: 'ai-service',
        audience: 'document-ai',
      }) as { sub?: string; email?: string; exp?: number; sources?: unknown };
      if (
        !claims.sub ||
        !isUUID(claims.sub) ||
        typeof claims.email !== 'string' ||
        !claims.email ||
        !claims.exp ||
        claims.exp > Math.floor(Date.now() / 1000) + 65 ||
        !isDeepStrictEqual(claims.sources, request.body?.documents)
      )
        throw new Error();
      request.aiActor = { id: claims.sub, email: claims.email };
      return true;
    } catch {
      throw new UnauthorizedException(AI_DOCUMENT_MESSAGES.UNAUTHORIZED);
    }
  }
}
