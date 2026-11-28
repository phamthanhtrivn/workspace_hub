import assert from "node:assert/strict";
import { test } from "node:test";
import { parseParticipantMetadata } from "./meeting-room.utils";

test("room metadata preserves a user photo and role", () => {
  assert.deepEqual(
    parseParticipantMetadata({
      metadata: JSON.stringify({
        role: "HOST",
        avatarUrl: "https://example.com/avatar.png",
      }),
    }),
    {
      role: "HOST",
      avatarUrl: "https://example.com/avatar.png",
    },
  );
});

test("missing or malformed room metadata cannot pass a non-string avatar to the image loader", () => {
  for (const metadata of [
    undefined,
    "",
    "{",
    "null",
    "[]",
    "42",
    '{"avatarUrl":{}}',
  ]) {
    const profile = parseParticipantMetadata({ metadata });
    assert.ok(!profile.avatarUrl);
    assert.equal(profile.role, undefined);
  }
});
