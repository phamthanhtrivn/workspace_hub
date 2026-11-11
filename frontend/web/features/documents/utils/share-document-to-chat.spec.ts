import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import * as channelApi from "@/features/chat/api/channel.api";
import * as directApi from "@/features/chat/api/direct-message.api";
import * as spaceApi from "@/features/chat/api/space.api";
import * as projectApi from "@/features/project/api/project.api";
import { SpaceRole } from "@/features/chat/types/chat.enums";
import type {
  ApiResponse,
  ChannelResponse,
  ChatMessageResponse,
  DirectConversationResponse,
} from "@/features/chat/types/chat.types";
import { documentsApi } from "../api/documents.api";
import {
  DocumentItemType,
  DocumentRole,
  ShareTabType,
} from "../types/documents.enums";
import type { AccessibleDocumentItem } from "../types/documents.types";
import { shareDocumentToChat } from "./share-document-to-chat";

function setup(context: TestContext) {
  const events: string[] = [];
  const channel = {
    id: "channel",
    members: [
      { userId: "owner", role: SpaceRole.ADMIN },
      { userId: "recipient", role: SpaceRole.MEMBER },
    ],
    setting: { allowSendMessage: true },
  } as ChannelResponse;
  const access: AccessibleDocumentItem = {
    isStarred: false,
    id: "document",
    name: "file",
    type: DocumentItemType.FILE,
    sizeBytes: 1,
    mimeType: null,
    projectId: null,
    userRole: DocumentRole.OWNER,
  };
  const metadata = context.mock.method(
    documentsApi,
    "getAccessibleItem",
    async () => access,
  );
  const channels = context.mock.method(
    spaceApi,
    "getSpaceChannels",
    async () =>
      ({ success: true, data: [channel] }) as ApiResponse<ChannelResponse[]>,
  );
  context.mock.method(
    directApi,
    "getDirectConversations",
    async () =>
      ({ success: true, data: [{ ...channel, id: "direct" }] }) as ApiResponse<
        DirectConversationResponse[]
      >,
  );
  context.mock.method(
    directApi,
    "getDirectMessageSendPermission",
    async () => ({ canSend: true, reason: null }),
  );
  const prepare = context.mock.method(
    documentsApi,
    "prepareChatShare",
    async (_id: string, recipients: string[]) => {
      events.push(`grant:${recipients.join(",")}`);
    },
  );
  const send = async (_id: string, payload: { type?: string }) => {
    events.push(`send:${payload.type}`);

    return { success: true, data: {} } as ApiResponse<ChatMessageResponse>;
  };
  const sendChannel = context.mock.method(
    channelApi,
    "sendChannelMessage",
    send,
  );
  const sendDirect = context.mock.method(directApi, "sendDirectMessage", send);

  return {
    events,
    channel,
    access,
    metadata,
    channels,
    prepare,
    sendChannel,
    sendDirect,
  };
}

for (const type of [ShareTabType.CHANNEL, ShareTabType.DM]) {
  test(`${type}: Viewer access is granted before the introduction and document card`, async (context) => {
    const h = setup(context);
    await shareDocumentToChat({
      documentId: "document",
      target: {
        type,
        chatId: type === ShareTabType.CHANNEL ? "channel" : "direct",
        spaceId: "space",
      },
      currentUserId: "owner",
      introMessage: "Read this",
    });
    assert.deepEqual(h.events, [
      "grant:recipient",
      "send:TEXT",
      "send:DOCUMENT",
    ]);
  });
}

test("channel sharing uses all current members, not the member-search limit", async (context) => {
  const h = setup(context);
  h.channel.members = [
    { userId: "owner", role: SpaceRole.ADMIN },
    ...Array.from({ length: 120 }, (_, index) => ({
      userId: `member-${index}`,
      role: SpaceRole.MEMBER,
    })),
  ] as ChannelResponse["members"];
  await shareDocumentToChat({
    documentId: "document",
    target: { type: ShareTabType.CHANNEL, chatId: "channel", spaceId: "space" },
    currentUserId: "owner",
    introMessage: "",
  });
  assert.equal(h.prepare.mock.calls[0].arguments[1].length, 120);
  assert.equal(h.events.length, 2);
});

test("grant failure sends neither text nor document", async (context) => {
  const h = setup(context);
  h.prepare.mock.mockImplementation(async () => {
    throw new Error("access unavailable");
  });
  await assert.rejects(
    shareDocumentToChat({
      documentId: "document",
      target: { type: ShareTabType.DM, chatId: "direct" },
      currentUserId: "owner",
      introMessage: "Read this",
    }),
  );
  assert.equal(h.sendDirect.mock.callCount(), 0);
});

test("a channel containing only the sender still accepts a document card", async (context) => {
  const h = setup(context);
  h.channel.members = h.channel.members.slice(0, 1);
  await shareDocumentToChat({
    documentId: "document",
    target: { type: ShareTabType.CHANNEL, chatId: "channel", spaceId: "space" },
    currentUserId: "owner",
    introMessage: "",
  });
  assert.equal(h.prepare.mock.callCount(), 0);
  assert.deepEqual(h.events, ["send:DOCUMENT"]);
});

test("message failure explains that granted Viewer permissions are retained", async (context) => {
  const h = setup(context);
  h.sendDirect.mock.mockImplementation(async () => {
    throw new Error("network failure");
  });
  await assert.rejects(
    shareDocumentToChat({
      documentId: "document",
      target: { type: ShareTabType.DM, chatId: "direct" },
      currentUserId: "owner",
      introMessage: "",
    }),
    /Viewer access already granted is retained/,
  );
  assert.deepEqual(h.events, ["grant:recipient"]);
});

test("failed membership refresh never falls through to sharing", async (context) => {
  const h = setup(context);
  h.channels.mock.mockImplementation(async () => {
    throw new Error("network unavailable");
  });
  await assert.rejects(
    shareDocumentToChat({
      documentId: "document",
      target: {
        type: ShareTabType.CHANNEL,
        chatId: "channel",
        spaceId: "space",
      },
      currentUserId: "owner",
      introMessage: "",
    }),
  );
  assert.equal(h.prepare.mock.callCount(), 0);
  assert.equal(h.sendChannel.mock.callCount(), 0);
});

test("sending disabled after the modal loads blocks grants and messages", async (context) => {
  const h = setup(context);
  h.channel.members[0].role = SpaceRole.MEMBER;
  h.channel.setting!.allowSendMessage = false;
  await assert.rejects(
    shareDocumentToChat({
      documentId: "document",
      target: {
        type: ShareTabType.CHANNEL,
        chatId: "channel",
        spaceId: "space",
      },
      currentUserId: "owner",
      introMessage: "",
    }),
  );
  assert.equal(h.prepare.mock.callCount(), 0);
});

test("project documents cannot be sent to DMs or another project's space", async (context) => {
  const h = setup(context);
  h.access.projectId = "project";
  context.mock.method(
    projectApi,
    "getProjectSpaceStatus",
    async () =>
      ({ spaceId: "project-space" }) as projectApi.ProjectSpaceStatusResponse,
  );
  for (const target of [
    { type: ShareTabType.DM, chatId: "direct" },
    { type: ShareTabType.CHANNEL, chatId: "channel", spaceId: "other-space" },
  ]) {
    await assert.rejects(
      shareDocumentToChat({
        documentId: "document",
        target,
        currentUserId: "owner",
        introMessage: "",
      }),
    );
  }
  assert.equal(h.prepare.mock.callCount(), 0);
});
