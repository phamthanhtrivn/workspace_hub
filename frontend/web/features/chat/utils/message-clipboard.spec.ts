import assert from "node:assert/strict";
import test from "node:test";
import {
  canCopyMessage,
  copyMessageToClipboard,
  downloadCopiedMessageFile,
  insertCopiedText,
} from "./message-clipboard";
import { CHAT_ATTACHMENT_MAX_SIZE_BYTES } from "../types/message-clipboard.types";

const attachment = { id: "file", name: "sample.txt", fileUrl: "https://files.example/sample", mimeType: "text/plain", sizeBytes: 4 };

test("ordinary text and every attachment kind can be copied without an author or age restriction", () => {
  assert.equal(canCopyMessage({ type: "TEXT", content: "hello" }), true);
  for (const mimeType of ["image/png", "video/mp4", "audio/webm", "application/pdf"]) {
    assert.equal(canCopyMessage({ type: "TEXT", content: null, medias: [{ ...attachment, mimeType }] }), true);
  }
  assert.equal(canCopyMessage({ type: "TEXT", content: " " }), false);
  assert.equal(canCopyMessage({ type: "TEXT", content: "hello", recalled: true }), false);
});

test("special cards are excluded, including legacy task cards stored as text", () => {
  for (const type of ["TASK", "POLL", "NOTE", "DOCUMENT", "SYSTEM", "EVENT", "MEETING"]) {
    assert.equal(canCopyMessage({ type, content: "card", medias: [attachment] }), false);
  }
  for (const content of ["[Task #123] hello", '{"type":"TASK","title":"hello"}', '{"title":"hello","taskId":"123"}']) {
    assert.equal(canCopyMessage({ type: "TEXT", content }), false);
  }
});

test("text copying preserves raw rich text, whitespace, quotes and code exactly", async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let copied = "";
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { writeText: async (text: string) => { copied = text; } } } });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "navigator", descriptor);
    else Reflect.deleteProperty(globalThis, "navigator");
  });
  const content = "  **Bold** 'quoted' @Tri\n[Link](https://example.com)\n```ts\n  const x = '<b>';\n```\n\n";
  await copyMessageToClipboard({ type: "TEXT", content }, "user");
  assert.equal(copied, content);
  await assert.rejects(copyMessageToClipboard({ type: "TASK", content }, "user"));
  await assert.rejects(copyMessageToClipboard({ type: "TEXT", content }, ""));
});

test("pasting replaces the selected range, including Ctrl+A, and otherwise inserts at the caret", () => {
  assert.deepEqual(insertCopiedText("before after", "**copy**", 7, 7), { value: "before **copy**after", caret: 15 });
  assert.deepEqual(insertCopiedText("before old after", "new", 7, 10), { value: "before new after", caret: 10 });
  assert.deepEqual(insertCopiedText("old draft", "new\ntext", 0, 9), { value: "new\ntext", caret: 8 });
  assert.deepEqual(insertCopiedText("existing", "", 3, 3), { value: "existing", caret: 3 });
});

test("attachments become real Files with the original bytes, name and MIME for a new upload", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, attachment.fileUrl);
    assert.equal(options.signal, controller.signal);
    return new Response(new Uint8Array([0, 1, 2, 255]));
  });
  const file = await downloadCopiedMessageFile(attachment, controller.signal);
  assert.equal(file.name, attachment.name);
  assert.equal(file.type, attachment.mimeType);
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), new Uint8Array([0, 1, 2, 255]));
  assert.equal("s3Key" in file, false);
});

test("download errors and oversized attachments are surfaced instead of creating empty files", async (t) => {
  const signal = new AbortController().signal;
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response("missing", { status: 404 }));
  await assert.rejects(downloadCopiedMessageFile(attachment, signal), /Could not prepare/);
  fetch.mock.resetCalls();
  await assert.rejects(downloadCopiedMessageFile({ ...attachment, sizeBytes: CHAT_ATTACHMENT_MAX_SIZE_BYTES + 1 }, signal), /100MB/);
  assert.equal(fetch.mock.callCount(), 0);
  fetch.mock.mockImplementation(async () => ({ ok: true, blob: async () => ({ size: CHAT_ATTACHMENT_MAX_SIZE_BYTES + 1 }) }) as Response);
  await assert.rejects(downloadCopiedMessageFile(attachment, signal), /100MB/);
});

test("an aborted download rejects so results cannot be pasted into a different chat", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    assert.equal(options.signal, controller.signal);
    throw new DOMException("Aborted", "AbortError");
  });
  controller.abort();
  await assert.rejects(downloadCopiedMessageFile(attachment, controller.signal), { name: "AbortError" });
});
