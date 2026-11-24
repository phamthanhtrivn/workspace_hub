import assert from "node:assert/strict";
import { test } from "node:test";
import type { DirectMessage } from "@/features/chat/types/chat.types";
import { SpaceRole } from "@/features/chat/types/chat.enums";
import {
  getDirectCopyRecipients,
  matchesCopySearch,
} from "./document-copy-recipients";

function conversation(id: string, users: string[]): DirectMessage {
  return {
    id,
    name: null,
    avatarUrl: null,
    createdBy: "owner",
    createdAt: "2026-11-24",
    updatedAt: "2026-11-24",
    projectId: null,
    members: users.map((userId) => ({
      id: userId,
      userId,
      joinedAt: "2026-11-24",
      lastReadMessageId: null,
      muted: false,
      role: SpaceRole.MEMBER,
      nickname: userId === "peer" ? "Teammate" : null,
      profile: {
        fullName: userId === "peer" ? "Nguyễn Minh" : userId,
        email: `${userId}@example.com`,
        avatarUrl: `${userId}-avatar`,
      },
    })),
  };
}

test("DM copy recipients come only from the current account's existing conversations", () => {
  const recipients = getDirectCopyRecipients(
    [
      conversation("existing", ["owner", "peer"]),
      conversation("other-people", ["stranger", "peer"]),
      conversation("self", ["owner"]),
    ],
    "owner",
  );
  assert.equal(recipients.length, 1);
  assert.deepEqual(recipients[0], {
    conversationId: "existing",
    userId: "peer",
    name: "Nguyễn Minh",
    email: "peer@example.com",
    nickname: "Teammate",
    avatarUrl: "peer-avatar",
  });
});

test("local recipient search matches name, email and nickname without creating new DMs", () => {
  const recipient = getDirectCopyRecipients(
    [conversation("existing", ["owner", "peer"])],
    "owner",
  )[0];
  for (const query of ["nguyen", "PEER@EXAMPLE", "team", "  "]) {
    assert.equal(
      matchesCopySearch(
        query,
        recipient.name,
        recipient.email,
        recipient.nickname,
      ),
      true,
    );
  }
  assert.equal(
    matchesCopySearch(
      "unrelated",
      recipient.name,
      recipient.email,
      recipient.nickname,
    ),
    false,
  );
});
