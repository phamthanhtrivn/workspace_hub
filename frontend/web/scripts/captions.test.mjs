import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../features/meeting/utils/meeting-captions.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});
const compiled = { exports: {} };
vm.runInNewContext(outputText, {
  exports: compiled.exports,
  module: compiled,
  TextDecoder,
  JSON,
  Number,
});
const { parseCaption, updateCaptions, isCaptionWorker } = compiled.exports;
const payload = (overrides = {}) =>
  new TextEncoder().encode(
    JSON.stringify({
      type: "caption",
      speakerId: "host",
      speakerName: "Việt Nhân",
      trackId: "mic-host",
      text: "Xin chào mọi người.",
      final: false,
      sequence: 1,
      ...overrides,
    }),
  );

test("Vietnamese captions retain speaker attribution and tentative/final state", () => {
  assert.equal(parseCaption(payload(), 100).speakerName, "Việt Nhân");
  assert.equal(parseCaption(payload(), 100).text, "Xin chào mọi người.");
  assert.equal(parseCaption(payload(), 100).final, false);
  assert.equal(parseCaption(payload({ final: true }), 200).final, true);
});
test("malformed, oversized and non-caption packets are ignored", () => {
  for (const data of [
    new Uint8Array([255]),
    new Uint8Array(8193),
    payload({ type: "error" }),
    payload({ sequence: -1 }),
    payload({ sequence: 1.1 }),
    payload({ text: "" }),
    payload({ text: "x".repeat(801) }),
    payload({ speakerName: 42 }),
  ])
    assert.equal(parseCaption(data, 100), null);
});
test("new hypotheses replace the previous text rather than duplicating it", () => {
  const old = parseCaption(payload(), 100);
  const next = parseCaption(
    payload({ text: "Xin chào mọi người. Hôm nay chúng ta họp.", sequence: 2 }),
    200,
  );
  const updated = updateCaptions([old], next);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].text, next.text);
});
test("out-of-order and duplicate packets do not overwrite newer captions", () => {
  const next = parseCaption(payload({ sequence: 2 }), 200);
  const current = [next];
  assert.equal(updateCaptions(current, parseCaption(payload(), 100)), current);
  assert.equal(updateCaptions(current, next), current);
});
test("concurrent speakers are kept separate and the visible history is bounded", () => {
  let current = [];
  for (let i = 0; i < 5; i++)
    current = updateCaptions(
      current,
      parseCaption(
        payload({ speakerId: "user-" + i, trackId: "track-" + i }),
        100,
      ),
    );
  assert.equal(current.length, 3);
  assert.equal(current[0].speakerId, "user-2");
  assert.equal(current[2].speakerId, "user-4");
});
test("caption workers are excluded from participant tiles without hiding humans", () => {
  assert.equal(isCaptionWorker("captions:meeting-id"), true);
  assert.equal(isCaptionWorker("user-id"), false);
});

test("a new microphone stream replaces the same speaker's previous caption after unmute", () => {
  const old = parseCaption(
    payload({ trackId: "old-stream", sequence: 10 }),
    100,
  );
  const next = parseCaption(
    payload({ trackId: "new-stream", sequence: 1 }),
    200,
  );
  const result = updateCaptions([old], next);
  assert.equal(result.length, 1);
  assert.equal(result[0].trackId, "new-stream");
});
