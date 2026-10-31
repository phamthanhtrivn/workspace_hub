import { UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isUUID } from "class-validator";

const MAX_TOKEN_LENGTH = 16_384;
const ACCESS_ROLES = new Set(["USER", "ADMIN"]);
const AUTHENTICATION_ERROR = "A valid access token is required";

export interface AccessClaims {
  email?: unknown;
  fullName?: unknown;
  avatarUrl?: unknown;
  sub?: unknown;
  exp?: unknown;
  nbf?: unknown;
  iss?: unknown;
  role?: unknown;
  token_use?: unknown;
}

export function verifyAccessClaims(
  token: unknown,
): AccessClaims & { sub: string; role: string } {
  try {
    const secret = process.env.JWT_SECRET_KEY;
    if (
      !secret ||
      Buffer.byteLength(secret) < 32 ||
      typeof token !== "string" ||
      token.length > MAX_TOKEN_LENGTH
    )
      throw new Error(AUTHENTICATION_ERROR);
    const parts = token.split(".");
    if (
      parts.length !== 3 ||
      parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
    )
      throw new Error(AUTHENTICATION_ERROR);
    const header = JSON.parse(
      Buffer.from(parts[0], "base64url").toString(),
    ) as { alg?: unknown; crit?: unknown };
    if (header.alg !== "HS256" || header.crit !== undefined)
      throw new Error(AUTHENTICATION_ERROR);
    const expected = createHmac("sha256", secret)
      .update(`${parts[0]}.${parts[1]}`)
      .digest();
    const signature = Buffer.from(parts[2], "base64url");
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)
    )
      throw new Error(AUTHENTICATION_ERROR);
    const claims = JSON.parse(
      Buffer.from(parts[1], "base64url").toString(),
    ) as AccessClaims;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof claims.exp !== "number" ||
      !Number.isSafeInteger(claims.exp) ||
      claims.exp <= now ||
      (claims.nbf !== undefined &&
        (typeof claims.nbf !== "number" ||
          !Number.isSafeInteger(claims.nbf) ||
          claims.nbf > now)) ||
      claims.iss !== (process.env.JWT_ISSUER || "workspace-hub") ||
      typeof claims.role !== "string" ||
      !ACCESS_ROLES.has(claims.role) ||
      (claims.token_use !== undefined && claims.token_use !== "access") ||
      typeof claims.sub !== "string" ||
      !isUUID(claims.sub)
    )
      throw new Error(AUTHENTICATION_ERROR);
    return claims as AccessClaims & { sub: string; role: string };
  } catch {
    throw new UnauthorizedException(AUTHENTICATION_ERROR);
  }
}

export function verifyAccessToken(token: unknown): string {
  return verifyAccessClaims(token).sub;
}
