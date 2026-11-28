import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MeetingMessageList } from "./meeting-message-list";
import { MeetingMessageItem } from "./meeting-message-item";
import type {
  MeetingMessageResponse,
  MeetingParticipantProfile,
} from "../../../types/meeting.types";

test("meeting chat uses the current participant profile instead of a cached message profile without an avatar", () => {
  const senderProfile: MeetingParticipantProfile = {
    fullName: "Sender",
    email: null,
    avatarUrl: null,
  };
  const currentProfile = {
    ...senderProfile,
    avatarUrl: "https://example.com/avatar.png",
  };
  const message = {
    id: "message",
    senderId: "sender",
    createdAt: "2026-11-09T00:00:00Z",
    senderProfile,
  } as MeetingMessageResponse;
  let tree: React.ReactElement;
  function Harness() {
    tree = MeetingMessageList({
      messages: [message],
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      loadOlderRef() {},
      profilesByUserId: { sender: currentProfile },
      onReact() {},
      onEdit() {},
      onRecall() {},
      onReadMessage() {},
    });

    return null;
  }
  renderToStaticMarkup(<Harness />);
  function findMessage(
    node: React.ReactNode,
  ): React.ReactElement<{ profile: MeetingParticipantProfile }> | undefined {
    for (const child of React.Children.toArray(node)) {
      if (!React.isValidElement<{ children?: React.ReactNode }>(child))
        continue;
      if (child.type === MeetingMessageItem)
        return child as React.ReactElement<{
          profile: MeetingParticipantProfile;
        }>;
      const match = findMessage(child.props.children);
      if (match) return match;
    }
  }
  const renderedMessage = findMessage(tree!);
  assert.ok(renderedMessage);
  assert.equal(renderedMessage.props.profile, currentProfile);
});
