import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { Request } from 'express';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.header('X-User-Id');

    if (!userId || !isUUID(userId)) {
      throw new UnauthorizedException('Missing or invalid authenticated user');
    }

    return userId;
  },
);
