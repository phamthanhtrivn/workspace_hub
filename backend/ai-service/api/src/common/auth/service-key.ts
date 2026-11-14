import { timingSafeEqual } from "node:crypto";
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { config } from "../../config/env.config";

export function matchesServiceKey(supplied: unknown, expected: string) {
  if (typeof supplied !== "string" || !expected) return false;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);

  return (
    suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes)
  );
}

/**
 * Authenticates a Communication-to-AI internal call. The caller is verified
 * before the feature flag is consulted, so an unauthenticated caller cannot
 * learn whether a feature is enabled.
 */
export function authorizeCommunicationCaller(
  supplied: unknown,
  feature: { enabled: boolean; unavailable?: string },
) {
  const expected = config.COMMUNICATION_TO_AI_KEY;
  if (config.AI_ENABLED !== "true" || expected.length < 32)
    throw new ServiceUnavailableException(feature.unavailable);
  if (!matchesServiceKey(supplied, expected)) throw new UnauthorizedException();
  if (!feature.enabled)
    throw new ServiceUnavailableException(feature.unavailable);
}
