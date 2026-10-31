import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { verifyAccessClaims } from "../auth/access-token";
import {
  applyIdentityHeaders,
  clearIdentityHeaders,
} from "../auth/identity-headers";

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
    if (context.getType() !== "http") return true;
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    clearIdentityHeaders(request);
    const authHeader = request.header("authorization");
    const token = authHeader?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
    if (!token)
      throw new UnauthorizedException("A valid access token is required");
    const claims = verifyAccessClaims(token);
    const userId = claims.sub;
    request.authenticatedUserId = userId;
    applyIdentityHeaders(request, claims);
    return true;
  }
}
