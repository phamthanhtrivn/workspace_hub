import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AccessTokenVerifier } from './access-token-verifier';

export interface AuthenticatedRequest extends Request {
  authenticatedUserId?: string;
}

@Injectable()
export class JwtIdentityGuard implements CanActivate {
  constructor(
    private readonly tokens: AccessTokenVerifier,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.getBearerToken(request.header('authorization'));
    const userId = this.tokens.verify(token);
    const gatewayUserId = request.header('x-user-id');

    if (!gatewayUserId || gatewayUserId !== userId) {
      throw new UnauthorizedException('Authenticated user context does not match token');
    }

    request.authenticatedUserId = userId;
    return true;
  }

  private getBearerToken(authorization: string | undefined): string {
    const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) throw new UnauthorizedException('Missing or invalid bearer token');
    return match[1];
  }

}
