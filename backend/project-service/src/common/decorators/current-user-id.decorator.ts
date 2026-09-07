import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/jwt-identity.guard';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.authenticatedUserId;

    if (!userId) throw new UnauthorizedException('Missing authenticated user');

    return userId;
  },
);
