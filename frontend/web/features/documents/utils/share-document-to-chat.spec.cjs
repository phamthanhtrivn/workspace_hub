/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));
function fixture() {
  const calls = [],
    attempt = {
      introRequestId: "intro",
      documentRequestId: "copy-and-send",
      introSent: false,
    };
  let failAttachment = false,
    completed = 0,
    versionHistory = [{ id: "version-1", isCurrent: true }];
  const send = (kind) => async (id, payload) => {
    calls.push({ kind, id, payload });
    if (failAttachment && payload.medias) {
      failAttachment = false;
      throw Error("Network");
    }

    return { success: true };
  };
  const copy = {
    name: "report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 10,
    s3Key: "chat-media/copy",
  };
  const { shareDocumentToChat } = load(
    "features/documents/utils/share-document-to-chat.ts",
    {
      "@/features/chat/api/direct-message.api": {
        sendDirectMessage: send("direct"),
      },
      "@/features/chat/api/channel.api": {
        sendChannelMessage: send("channel"),
      },
      "@/features/meeting/api/meeting.api": {
        sendMeetingMessage: send("meeting"),
      },
      "@/features/project/api/task.api": { attachTaskDocuments: send("task") },
      "@/features/chat/api/document-attachment.api": {
        copyDocumentsToChat: async (files, context, signal, operationId) => {
          calls.push({ kind: "copy", files, context, operationId });

          return [copy];
        },
      },
      "../api/documents.api": {
        documentsApi: {
          getVersions: async () => {
            calls.push({ kind: "versions" });

            return versionHistory;
          },
        },
      },
      "../api/file-copy.api": {
        fileCopyApi: {
          project: async (...args) => {
            calls.push({ kind: "project", args });

            return [{ id: "independent-project-copy" }];
          },
        },
      },
      "./document-chat-share-attempt": {
        getDocumentChatShareAttempt: async () => ({
          attempt,
          save() {},
          complete() {
            completed++;
          },
        }),
      },
    },
  );

  return {
    calls,
    attempt,
    setVersions: (versions) => {
      versionHistory = versions;
    },
    completed: () => completed,
    failNextAttachment: () => {
      failAttachment = true;
    },
    run: (options) =>
      shareDocumentToChat({
        documentId: "source",
        currentUserId: "owner",
        introMessage: "",
        ...options,
      }),
  };
}

test("Send a copy uses the chosen Current version instead of the newest upload", async () => {
  const f = fixture();
  f.setVersions([
    { id: "newer-upload", isCurrent: false },
    { id: "chosen-current", isCurrent: true },
  ]);
  await f.run({ target: { type: "direct", chatId: "destination" } });
  assert.equal(
    f.calls.find((call) => call.kind === "copy").files[0].versionId,
    "chosen-current",
  );
});

test("a pinned batch version is reused without fetching a different Current between recipients", async () => {
  const f = fixture();
  await f.run({
    target: { type: "direct", chatId: "destination" },
    sourceVersionId: "batch-version",
  });
  assert.equal(f.calls.filter((call) => call.kind === "versions").length, 0);
  assert.equal(
    f.calls.find((call) => call.kind === "copy").files[0].versionId,
    "batch-version",
  );
});
for (const type of ["channel", "direct", "meeting"])
  test(`${type} receives an independent upload-style attachment without source grants`, async () => {
    const f = fixture();
    await f.run({
      target: { type, chatId: "destination", joinToken: "meeting-token" },
      introMessage: "Read this",
    });
    const sends = f.calls.filter((call) => call.kind === type);
    assert.equal(sends.length, 2);
    assert.equal(sends[0].payload.content, "Read this");
    assert.equal(sends[1].payload.medias[0].s3Key, "chat-media/copy");
    assert.notEqual(sends[1].payload.type, "DOCUMENT");
    assert.equal(f.completed(), 1);
  });
test("retry preserves version/copy/send IDs and skips the already confirmed introduction", async () => {
  const f = fixture();
  f.failNextAttachment();
  const request = {
    target: { type: "channel", chatId: "channel" },
    introMessage: "Introduction",
  };
  await assert.rejects(f.run(request));
  await f.run(request);
  assert.equal(f.calls.filter((call) => call.kind === "versions").length, 1);
  assert.equal(
    f.calls.filter((call) => call.kind === "channel" && !call.payload.medias)
      .length,
    1,
  );
  assert.deepEqual(
    f.calls
      .filter((call) => call.kind === "copy")
      .map((call) => call.operationId),
    ["copy-and-send", "copy-and-send"],
  );
  assert.equal(f.completed(), 1);
});
test("Project optionally attaches the copied document, never the original", async () => {
  const f = fixture();
  await f.run({
    target: { type: "project", chatId: "project", taskId: "task" },
  });
  const attach = f.calls.find((call) => call.kind === "task");
  assert.deepEqual(attach.payload.documentItemIds, [
    "independent-project-copy",
  ]);
  assert.equal(
    f.calls.some((call) => call.kind === "copy"),
    false,
  );
});
test("folders cannot be sent to Project and an account change prevents mutations", async () => {
  const f = fixture();
  await assert.rejects(
    f.run({ isFolder: true, target: { type: "project", chatId: "project" } }),
    /individual files/,
  );
  await assert.rejects(
    f.run({
      target: { type: "channel", chatId: "channel" },
      assertCurrentActor() {
        throw Error("Account changed");
      },
    }),
    /Account changed/,
  );
  assert.equal(f.calls.length, 0);
});
