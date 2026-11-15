import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getChannelMentionOptions,
  getCachedMentionOptions,
} from "./mention-member-utils";

test("General offers All and other channels offer Channel, including manual All searches", () => {
  for (const groupMention of ["all", "channel"] as const) {
    for (const searchQuery of ["", "all", "channel", "everyone"]) {
      const groups = getChannelMentionOptions(undefined, "sender", {
        groupMention,
        searchQuery,
      }).filter((option) => option.isGroup);
      assert.deepEqual(groups, [
        {
          id: groupMention,
          name: groupMention === "all" ? "All" : "Channel",
          avatarUrl: undefined,
          isGroup: true,
        },
      ]);
    }
  }
});

test("individual/bot searches keep their full limit when the group does not match", () => {
  const options = getChannelMentionOptions(undefined, "sender", {
    groupMention: "channel",
    searchQuery: "bot",
  });
  assert.equal(
    options.some((option) => option.isGroup),
    false,
  );
  assert.equal(options[0].name, "AI Bot");
});

test("DM suggestions have no Space/channel group and group defaults do not leak between contexts", () => {
  assert.equal(
    getCachedMentionOptions([], {}, "").some(
      (option) => option.id === "all" || option.id === "channel",
    ),
    false,
  );
  assert.equal(
    getChannelMentionOptions(undefined, "sender").some(
      (option) => option.isGroup,
    ),
    false,
  );
});
