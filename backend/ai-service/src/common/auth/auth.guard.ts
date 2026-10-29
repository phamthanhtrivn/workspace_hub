import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { z } from "zod";
import { matchesServiceKey } from "./service-key";
import type { Request } from "express";
import { config } from "../../config/env.config";
import type { Actor } from "../types";
export type AuthRequest = Request & { actor: Actor };
const gatewayIdentity = z
  .object({
    "x-user-id": z.string().uuid(),
    "x-user-email": z.string().email(),
    "x-user-role": z.string().optional(),
  })
  .refine((headers) => headers["x-user-role"] !== "RESET_PASSWORD_ROLE");
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (config.AI_ENABLED !== "true")
      throw new ServiceUnavailableException("Notebook AI chưa được bật");
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const proof = req.headers["x-workspace-gateway-key"];
    const keys = [config.AI_GATEWAY_KEY, config.AI_GATEWAY_KEY_PREVIOUS].filter(
      (key) => key.length >= 32,
    );
    if (!keys.length)
      throw new ServiceUnavailableException(
        "Gateway authentication is not configured",
      );
    if (!keys.some((key) => matchesServiceKey(proof, key)))
      throw new UnauthorizedException("Trusted gateway required");
    // Kong verifies the JWT and replaces client-supplied identity headers.
    // The dedicated proof also rejects forged user headers sent directly to this service.
    const result = gatewayIdentity.safeParse(req.headers);
    if (!result.success)
      throw new UnauthorizedException("Missing or invalid gateway identity");
    req.actor = {
      id: result.data["x-user-id"],
      email: result.data["x-user-email"],
    };
    return true;
  }
}
