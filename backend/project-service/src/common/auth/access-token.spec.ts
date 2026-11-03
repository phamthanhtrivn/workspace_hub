import { test } from "node:test";
import * as assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyAccessClaims } from "./access-token";
import { assertActiveSession } from "./session-authorization";

test("access identity requires a verified email, access purpose, sid and valid lifetime", () => {
  const previous = process.env.JWT_SECRET_KEY;
  process.env.JWT_SECRET_KEY = "test-only-signing-secret-at-least-32-bytes";
  const sign = (overrides: Record<string, unknown> = {}) => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString(
      "base64url",
    );
    const payload = Buffer.from(
      JSON.stringify({
        sub: "00000000-0000-4000-8000-000000000001",
        sid: "00000000-0000-4000-8000-000000000002",
        email_verified: true,
        iss: process.env.JWT_ISSUER || "workspace-hub",
        role: "USER",
        token_use: "access",
        exp: Math.floor(Date.now() / 1000) + 60,
        ...overrides,
      }),
    ).toString("base64url");
    return `${header}.${payload}.${createHmac("sha256", process.env.JWT_SECRET_KEY!).update(`${header}.${payload}`).digest("base64url")}`;
  };
  try {
    assert.equal(
      verifyAccessClaims(sign()).sub,
      "00000000-0000-4000-8000-000000000001",
    );
    for (const overrides of [
      { sid: undefined },
      { email_verified: false },
      { email_verified: undefined },
      { token_use: "password_reset" },
      { exp: 1 },
      { role: "SUPER_ADMIN" },
    ])
      assert.throws(() => verifyAccessClaims(sign(overrides)));
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET_KEY;
    else process.env.JWT_SECRET_KEY = previous;
  }
});

test("session authorization rechecks revocation and refuses dependency failures", async () => {
  const originalFetch = globalThis.fetch;
  const previousUrl = process.env.USER_SERVICE_URL,
    previousKey = process.env.INTERNAL_SERVICE_KEY;
  process.env.USER_SERVICE_URL = "https://user-service.invalid";
  process.env.INTERNAL_SERVICE_KEY = "test-only-internal-service-key-32-bytes";
  const identity = {
    sub: "00000000-0000-4000-8000-000000000001",
    sid: "00000000-0000-4000-8000-000000000002",
    exp: Math.floor(Date.now() / 1000) + 60,
  };
  let active = true,
    checks = 0;
  globalThis.fetch = async () => {
    checks++;
    return new Response(JSON.stringify({ active }), { status: 200 });
  };
  try {
    await assertActiveSession(identity);
    active = false;
    await assert.rejects(assertActiveSession(identity));
    assert.equal(checks, 2);
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    await assert.rejects(assertActiveSession(identity));
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.USER_SERVICE_URL;
    else process.env.USER_SERVICE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.INTERNAL_SERVICE_KEY;
    else process.env.INTERNAL_SERVICE_KEY = previousKey;
  }
});
