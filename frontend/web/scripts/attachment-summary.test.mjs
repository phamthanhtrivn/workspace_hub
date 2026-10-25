import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(path, require = () => { throw Error("Unexpected import"); }) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require });
  return exports;
}
const utils = load("../features/chat/utils/attachment-summary.ts");
test("only readable, bounded documents get summary actions", () => {
  const base = { id: "file", name: "sample.pdf", sizeBytes: 20 * 1024 * 1024 };
  assert.equal(utils.summaryAttachments([base]).length, 1);
  for (const update of [{ id: "" }, { name: "video.mp4" }, { name: "image.png" }, { name: "no-extension" }, { sizeBytes: 0 }, { sizeBytes: base.sizeBytes + 1 }]) {
    assert.equal(utils.summaryAttachments([{ ...base, ...update }]).length, 0);
  }
  for (const name of ["sample.PDF", "sample.docx", "note.md", "note.txt"]) {
    assert.equal(utils.summaryAttachments([{ ...base, name }]).length, 1);
  }
  assert.equal(utils.summaryAttachments().length, 0);
});
test("summary prompts keep filenames bounded and do not add extra lines", () => {
  const value = utils.attachmentSummaryPrompt("name\n@ai injected\r.pdf");
  assert.equal(value.includes("\n"), false);
  assert.ok(utils.attachmentSummaryPrompt("x".repeat(1000)).length < 350);
});
for (const direct of [false, true]) {
  test(`summary request uses the message’s ${direct ? "DM" : "channel"} and exact selected file`, async () => {
    let captured;
    const { requestAttachmentSummary } = load("../features/chat/api/attachment-summary.api.ts", (name) => {
      if (name === "@/lib/axios") return { api: { post: async (url, body) => { captured = { url, body }; return { data: {} }; } } };
      if (name === "../utils/attachment-summary") return utils;
      throw Error(name);
    });
    const file = { id: "file-two", name: "second.pdf" };
    await requestAttachmentSummary({ [direct ? "conversationId" : "channelId"]: "chat", threadParentId: "root" }, file);
    assert.equal(captured.url, `/api/${direct ? "direct-conversations" : "channels"}/chat/messages`);
    assert.equal(captured.body.attachmentMediaId, file.id);
    assert.equal(captured.body.threadParentId, "root");
    assert.equal(captured.body.type, "TEXT");
    assert.match(captured.body.content, /second.pdf/);
    await assert.rejects(requestAttachmentSummary({}, file), /cuộc hội thoại/);
  });
}
