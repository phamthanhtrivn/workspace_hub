/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS hook harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));

function fixture() {
  const states = [],
    queries = [],
    sent = [];
  let stateIndex = 0;
  const member = (userId, nickname) => ({
    userId,
    role: "MEMBER",
    nickname,
    profile: {
      fullName: nickname,
      email: `${userId}@example.com`,
      avatarUrl: `${userId}-avatar`,
    },
  });
  const direct = ["alice", "bob"].map((name) => ({
    id: `dm-${name}`,
    members: [member("owner", "Owner"), member(name, name)],
  }));
  const bySpace = {
    first: [
      { id: "allowed", name: "general", members: [member("owner", "Owner")] },
      {
        id: "read-only",
        name: "announcements",
        members: [member("owner", "Owner")],
        setting: { allowSendMessage: false },
      },
      {
        id: "not-joined",
        name: "private",
        members: [member("other", "Other")],
      },
    ],
    second: [
      {
        id: "second-channel",
        name: "research",
        members: [member("owner", "Owner")],
      },
    ],
  };
  const { useShareToChat } = load(
    "features/documents/hooks/useShareToChat.ts",
    {
      react: {
        ...React,
        useMemo: (factory) => factory(),
        useState(initial) {
          const index = stateIndex++;
          if (!(index in states)) states[index] = initial;

          return [
            states[index],
            (next) => {
              states[index] =
                typeof next === "function" ? next(states[index]) : next;
            },
          ];
        },
      },
      "@/store/store": {
        useAppSelector: (selector) => selector({ auth: { userId: "owner" } }),
      },
      "@/features/chat/hooks/useChatQueries": {
        useSpacesQuery: (actor) => {
          queries.push(["spaces", actor]);

          return {
            data: actor
              ? [
                  { id: "first", name: "First" },
                  { id: "second", name: "Second" },
                ]
              : undefined,
          };
        },
        useSpaceChannelsQuery: (spaceId, _query, options) => {
          queries.push(["channels", spaceId, options.enabled]);

          return {
            data: options.enabled ? { channels: bySpace[spaceId] } : undefined,
          };
        },
        useDirectMessagesQuery: (actor) => {
          queries.push(["direct", actor]);

          return { data: actor ? { directMessages: direct } : undefined };
        },
      },
      "./use-document-copy-delivery": {
        useDocumentCopyDelivery: () => ({
          batch: null,
          configurationLocked: false,
          isSubmitting: false,
          send: (...args) => sent.push(args),
        }),
      },
    },
  );
  const render = () => {
    stateIndex = 0;

    return useShareToChat({ item: { id: "file" }, onSuccess() {} });
  };

  return { render, queries, sent };
}

test("Channel selection is limited to one writable joined channel in one space", () => {
  const f = fixture();
  let hook = f.render();
  assert.deepEqual(
    hook.channels.map((channel) => channel.id),
    ["allowed"],
  );
  assert.equal(hook.canSubmit, false);
  hook.setSelectedChannelId("allowed");
  hook = f.render();
  assert.equal(hook.canSubmit, true);
  hook.setSelectedSpaceId("second");
  hook = f.render();
  assert.equal(hook.selectedChannelId, "");
  hook.setSelectedChannelId("second-channel");
  hook = f.render();
  hook.handleShare();
  assert.deepEqual(f.sent[0][0], [
    { type: "channel", chatId: "second-channel", label: "#research" },
  ]);
  hook.changeTab("project");
  assert.equal(f.render().activeTab, "channel");
});

test("DMs support multiple existing recipients and chip removal without querying global users", () => {
  const f = fixture();
  f.render().changeTab("direct");
  let hook = f.render();
  hook.toggleDirect("dm-alice");
  hook.toggleDirect("dm-bob");
  hook.toggleDirect("unknown-user");
  hook = f.render();
  assert.equal(hook.selectedCount, 2);
  hook.handleShare();
  assert.deepEqual(
    f.sent[0][0].map((target) => target.chatId),
    ["dm-alice", "dm-bob"],
  );
  hook.toggleDirect("dm-alice");
  assert.deepEqual(
    f.render().selectedRecipients.map((recipient) => recipient.conversationId),
    ["dm-bob"],
  );
  assert.ok(
    f.queries.some((query) => query[0] === "direct" && query[1] === "owner"),
  );
});
