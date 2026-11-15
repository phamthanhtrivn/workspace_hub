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
      return { requiresConfirmation: false, inheritedEditorCount: 0 };
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

test("inherited Editor access waits for explicit confirmation before sending", async (context) => {
  const h = setup(context);
  h.prepare.mock.mockImplementation(async () => ({ requiresConfirmation: true, inheritedEditorCount: 1 }));
  const input = { documentId: "document", target: { type: ShareTabType.DM, chatId: "direct" }, currentUserId: "owner", introMessage: "Read this" };
  assert.deepEqual(await shareDocumentToChat(input), { requiresConfirmation: true, inheritedEditorCount: 1 });
  assert.equal(h.sendDirect.mock.callCount(), 0);
  h.prepare.mock.mockImplementation(async () => ({ requiresConfirmation: false, inheritedEditorCount: 1 }));
  await shareDocumentToChat({ ...input, confirmInheritedEditorAccess: true });
  assert.equal(h.prepare.mock.calls[1].arguments[2], true);
  assert.equal(h.sendDirect.mock.callCount(), 2);
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

for (const type of [ShareTabType.CHANNEL, ShareTabType.DM]) {
  for (const lostStep of ["TEXT", "DOCUMENT"]) {
    test(`${type}: retry after ${lostStep} response loss reuses IDs and never duplicates either message`, async (context) => {
      const h = setup(context);
      const input = {
        documentId: "document", currentUserId: "owner",
        introMessage: `Retry ${type} ${lostStep}`,
        target: { type, chatId: type === ShareTabType.CHANNEL ? "channel" : "direct", spaceId: "space" },
      };
      const accepted = new Map<string, string>();
      const attempts: { type: string; requestId: string }[] = [];
      let loseResponse = true;
      const send = async (_id: string, payload: { type?: string; clientRequestId?: string }) => {
        assert.ok(payload.clientRequestId);
        attempts.push({ type: payload.type!, requestId: payload.clientRequestId });
        accepted.set(payload.clientRequestId, payload.type!);
        if (payload.type === lostStep && loseResponse) {
          loseResponse = false;
          throw new Error("Timeout after server commit");
        }
        return { success: true, data: {} } as ApiResponse<ChatMessageResponse>;
      };
      (type === ShareTabType.CHANNEL ? h.sendChannel : h.sendDirect).mock.mockImplementation(send);
      await assert.rejects(shareDocumentToChat(input));
      if (type === ShareTabType.DM) input.target.spaceId = "unrelated-space";
      await shareDocumentToChat(input);
      assert.deepEqual([...accepted.values()].sort(), ["DOCUMENT", "TEXT"]);
      const retried = attempts.filter(attempt => attempt.type === lostStep);
      assert.equal(retried.length, 2);
      assert.equal(retried[0].requestId, retried[1].requestId);
      if (lostStep === "DOCUMENT") assert.equal(attempts.filter(attempt => attempt.type === "TEXT").length, 1);
      assert.equal(h.metadata.mock.callCount(), 2, "retry rechecks document access");
      assert.equal(h.prepare.mock.callCount(), 2, "retry refreshes recipients/grants");
    });
  }
}

test("retry after partial success stops when sending permission has been revoked", async (context) => {
  const h = setup(context);
  const input = {
    documentId: "document", currentUserId: "owner", introMessage: "Partial then revoked",
    target: { type: ShareTabType.CHANNEL, chatId: "channel", spaceId: "space" },
  };
  h.sendChannel.mock.mockImplementation(async (_id: string, payload: { type?: string }) => {
    if (payload.type === "DOCUMENT") throw new Error("Network failure");
    return { success: true, data: {} } as ApiResponse<ChatMessageResponse>;
  });
  await assert.rejects(shareDocumentToChat(input));
  h.channel.members[0].role = SpaceRole.MEMBER;
  h.channel.setting!.allowSendMessage = false;
  await assert.rejects(shareDocumentToChat(input), /cannot send/);
  assert.equal(h.sendChannel.mock.callCount(), 2);
  assert.equal(h.prepare.mock.callCount(), 1);
});

test("an account change after the introduction prevents sending the document with the new login", async context => {
  const h = setup(context);
  let accountChanged = false;
  h.sendDirect.mock.mockImplementation(async () => {
    accountChanged = true;
    return { success: true, data: {} } as ApiResponse<ChatMessageResponse>;
  });
  await assert.rejects(shareDocumentToChat({
    documentId: "document", currentUserId: "owner", introMessage: "Switch login",
    target: { type: ShareTabType.DM, chatId: "direct" },
    assertCurrentActor: () => { if (accountChanged) throw Error("Account changed"); },
  }));
  assert.equal(h.sendDirect.mock.callCount(), 1);
  assert.equal(h.prepare.mock.callCount(), 1);
});
