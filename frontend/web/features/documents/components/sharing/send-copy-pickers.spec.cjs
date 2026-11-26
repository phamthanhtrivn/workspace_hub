/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS interaction harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const {
  createSourceLoader,
} = require("../../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../../.."));
function descendants(node) {
  return React.Children.toArray(node).flatMap((child) =>
    React.isValidElement(child)
      ? [child, ...descendants(child.props.children)]
      : [],
  );
}

test("DM picker keeps selected avatar chips visible while search filters the existing recipients", () => {
  const { DirectCopyPicker } = load(
    "features/documents/components/sharing/direct-copy-picker.tsx",
    {
      react: { ...React, useState: () => ["bob", () => {}] },
    },
  );
  const alice = {
    conversationId: "dm-a",
    name: "Alice",
    email: "alice@example.com",
    nickname: "",
    avatarUrl: "alice-photo",
  };
  const bob = {
    conversationId: "dm-b",
    name: "Bob",
    email: "bob@example.com",
    nickname: "",
    avatarUrl: "bob-photo",
  };
  const toggled = [];
  const tree = DirectCopyPicker({
    recipients: [alice, bob],
    selected: [alice],
    locked: false,
    onToggle: (id) => toggled.push(id),
  });
  const nodes = descendants(tree);
  const chip = nodes.find((node) => node.type.name === "SelectedUserChip");
  assert.equal(chip.props.avatarUrl, "alice-photo");
  chip.props.onRemove();
  const checkbox = nodes.find(
    (node) => node.props["aria-label"] === "Select Bob",
  );
  assert.ok(checkbox);
  assert.ok(!nodes.some((node) => node.props["aria-label"] === "Select Alice"));
  checkbox.props.onCheckedChange(true);
  assert.deepEqual(toggled, ["dm-a", "dm-b"]);
});

test("Channel picker searches within its space and exposes a single-value radio group", () => {
  const { ChannelCopyPicker } = load(
    "features/documents/components/sharing/channel-copy-picker.tsx",
    {
      react: {
        ...React,
        useState: () => ["research", () => {}],
        useId: () => "channel-choice",
      },
    },
  );
  const calls = [];
  const spaces = [
    { id: "one", name: "One" },
    { id: "two", name: "Two" },
  ];
  const tree = ChannelCopyPicker({
    spaces,
    channels: [
      { id: "general", name: "general" },
      { id: "research", name: "research" },
    ],
    selectedSpaceId: "one",
    selectedChannelId: "",
    locked: false,
    onSpaceChange: (id) => calls.push(["space", id]),
    onChannelChange: (id) => calls.push(["channel", id]),
  });
  const nodes = descendants(tree);
  nodes
    .find((node) => node.props.items === spaces)
    .props.onValueChange(spaces[1]);
  const group = nodes.find(
    (node) => node.props["aria-label"] === "Choose one channel",
  );
  assert.equal(group.props.value, "");
  group.props.onValueChange("research");
  assert.ok(nodes.some((node) => node.props.value === "research"));
  assert.ok(
    !nodes.some((node) => node.props["aria-label"] === "Send to general"),
  );
  assert.deepEqual(calls, [
    ["space", "two"],
    ["channel", "research"],
  ]);
});

test("Send a copy exposes only Channels and DMs", () => {
  const pass = ({ children }) => React.createElement("div", null, children);
  const { ShareToChatModal } = load(
    "features/documents/components/sharing/share-to-chat-modal.tsx",
    {
      "@/store/store": {
        useAppSelector: (selector) => selector({ auth: { userId: "owner" } }),
      },
      "@/components/ui/dialog": {
        Dialog: pass,
        DialogContent: pass,
        DialogHeader: pass,
        DialogTitle: pass,
        DialogFooter: pass,
      },
      "../../hooks/useShareToChat": {
        useShareToChat: () => ({
          activeTab: "direct",
          changeTab() {},
          directRecipients: [],
          selectedRecipients: [],
          toggleDirect() {},
          locked: false,
          isSubmitting: false,
          selectedCount: 0,
          canSubmit: false,
          introMessage: "",
          setIntroMessage() {},
        }),
      },
    },
  );
  const markup = renderToStaticMarkup(
    React.createElement(ShareToChatModal, {
      open: true,
      item: {
        id: "file",
        name: "report.pdf",
        type: "FILE",
        mimeType: "application/pdf",
      },
      onClose() {},
    }),
  );
  assert.match(markup, /Channels/);
  assert.match(markup, /DMs/);
  assert.doesNotMatch(markup, /Meetings|Projects|Select destination/);
});

test("Space invitation chips retain the selected member avatar and removal action", () => {
  const user = {
    id: "alice",
    fullName: "Alice",
    email: "alice@example.com",
    avatarUrl: "alice-avatar",
  };
  const states = ["", false, [], "", [user], false];
  let stateIndex = 0;
  const { default: InviteSpaceMembersModal } = load(
    "features/chat/components/modals/space/invite-space-members-modal.tsx",
    {
      react: {
        ...React,
        useEffect() {},
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
      "@/lib/hooks/use-hydrated": { useHydrated: () => true },
      "@/features/chat/api/chat.api": {
        searchUserByEmail() {},
        inviteSpaceMembers() {},
      },
    },
  );
  const form = InviteSpaceMembersModal({
    isOpen: true,
    spaceId: "space",
    onClose() {},
  });
  const render = () => {
    stateIndex = 0;

    return form.type(form.props);
  };
  const chip = descendants(render()).find(
    (node) => node.type.name === "SelectedUserChip",
  );
  assert.equal(chip.props.avatarUrl, "alice-avatar");
  assert.equal(chip.props.name, "Alice");
  chip.props.onRemove();
  assert.ok(
    !descendants(render()).some(
      (node) => node.type.name === "SelectedUserChip",
    ),
  );
});
