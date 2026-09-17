import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface AuthenticatedRequest extends Request {
  authenticatedUserId?: string;
}

@Injectable()
export class JwtIdentityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const gatewayUserId =
      request.header('x-user-id') ||
      (request.headers['x-user-id'] as string | undefined);

    if (gatewayUserId && isUUID(gatewayUserId)) {
      request.authenticatedUserId = gatewayUserId;
      return true;
    }

    // Fallback: extract sub from Authorization header payload if x-user-id header was not populated
    const authHeader = request.header('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const decoded = JSON.parse(
            Buffer.from(payloadBase64, 'base64').toString(),
          );
          const userId = decoded.sub || decoded.id;
          if (userId && isUUID(userId)) {
            request.authenticatedUserId = userId;
            return true;
          }
        }
      } catch {
        // Ignore fallback decode error
      }
    }

    throw new UnauthorizedException('Missing or invalid authenticated user');
  }
}
