import assert from "node:assert/strict";
import { test } from "node:test";
import { splitMentionText, getMentionNames } from "./mention-presentation";
import { getCachedMentionOptions } from "./mention-member-utils";

test("a full multi-word mention is one token, preferring the longest known name", () => {
  const parts = splitMentionText("hi @Tri Phan, can you check?", [
    "Tri",
    "Tri Phan",
  ]);
  assert.deepEqual(
    parts.filter((part) => part.mention).map((part) => part.text),
    ["@Tri Phan"],
  );
  assert.equal(
    parts.map((part) => part.source ?? part.text).join(""),
    "hi @Tri Phan, can you check?",
  );
});

test("Unicode names, nickname aliases and repeated mentions retain their complete labels", () => {
  const names = getMentionNames({
    user: {
      fullName: "Phan Thanh Trí",
      mentionNames: ["Tri Phan"],
      email: null,
      avatarUrl: null,
    },
  });
  assert.deepEqual(
    splitMentionText("@Phan Thanh Trí and @Tri Phan!", names)
      .filter((part) => part.mention)
      .map((part) => part.text),
    ["@Phan Thanh Trí", "@Tri Phan"],
  );
});

test("mentions do not consume name prefixes, emails, inline code or unknown names", () => {
  for (const value of [
    "@Tristan",
    "tri@Tri.test",
    "`@Tri Phan`",
    "@Unknown Name",
    "@Allison",
  ]) {
    assert.equal(
      splitMentionText(value, ["Tri", "Tri Phan"]).some((part) => part.mention),
      false,
      value,
    );
  }
});

test("bot mentions normalize for display while preserving input text and offsets", () => {
  const parts = splitMentionText("@ai explain; @AI Bot help");
  assert.deepEqual(
    parts.filter((part) => part.ai).map((part) => part.text),
    ["@AI Bot", "@AI Bot"],
  );
  assert.equal(
    parts.map((part) => part.source ?? part.text).join(""),
    "@ai explain; @AI Bot help",
  );
  assert.deepEqual(getCachedMentionOptions([], {}, "bot"), [
    { id: "ai", name: "AI Bot", avatarUrl: undefined },
  ]);
});

test("mention boundaries preserve punctuation and special characters in names", () => {
  const text = "(@A+B [Team]), @All: ready";
  const parts = splitMentionText(text, ["A+B [Team]"]);
  assert.deepEqual(
    parts.filter((part) => part.mention).map((part) => part.text),
    ["@A+B [Team]", "@All"],
  );
  assert.equal(parts.map((part) => part.source ?? part.text).join(""), text);
});
