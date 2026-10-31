import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { HTTP_AUTHENTICATION } from '../decorators/http-authentication.decorator';
import { verifyAccessClaims } from '../auth/access-token';
import {
  applyIdentityHeaders,
  clearIdentityHeaders,
} from '../auth/identity-headers';

@Injectable()
export class JwtIdentityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const mode = this.reflector.getAllAndOverride<string>(HTTP_AUTHENTICATION, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request>();
    clearIdentityHeaders(request);
    if (mode === 'public' || mode === 'independent') return true;
    const authorization = request.header('authorization');
    if (!authorization && mode === 'optional') return true;
    const token = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
    if (!token)
      throw new UnauthorizedException('A valid access token is required');
    applyIdentityHeaders(request, verifyAccessClaims(token));
    return true;
  }
}
