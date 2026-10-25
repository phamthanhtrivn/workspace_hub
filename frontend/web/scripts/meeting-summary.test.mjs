import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL(
    "../features/meeting/components/recordings/meeting-recording-summary.tsx",
    import.meta.url,
  ),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2020,
  },
});
function render(summary, extras = {}) {
  const compiled = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiled,
    exports: compiled.exports,
    require: (name) =>
      name.includes("use-meeting-summary")
        ? {
            useMeetingSummary: () => ({
              summary,
              create() {},
              refresh() {},
              ...extras,
            }),
          }
        : name.includes("meeting-form-controls")
          ? {
              MeetingButton: ({ tone: _tone, ...props }) =>
                React.createElement("button", props),
            }
          : require(name),
  });
  return renderToStaticMarkup(
    React.createElement(compiled.exports.MeetingRecordingSummary, {
      recordingId: "fixture",
    }),
  );
}
test("only an authorized owner sees the paid creation action", () => {
  const summary = { enabled: true, status: "NOT_CREATED", canCreate: true };
  assert.match(render(summary), /Tóm tắt bằng AI/);
  assert.doesNotMatch(render({ ...summary, canCreate: false }), /<button/);
  assert.equal(render({ ...summary, enabled: false }), "");
});
test("processing shows progress without a duplicate creation button", () => {
  const html = render({
    enabled: true,
    status: "RUNNING",
    stage: "TRANSCRIBING",
    transcribedChunks: 3,
    canCreate: true,
  });
  assert.match(html, /Đã xử lý 3 đoạn/);
  assert.doesNotMatch(html, /<button/);
});
test("model content is rendered as escaped text and unavailable state hides cached content", () => {
  const summary = {
    enabled: true,
    status: "COMPLETED",
    content: "<script>alert(1)</script>",
  };
  assert.doesNotMatch(render(summary), /<script>/);
  assert.match(render(summary), /&lt;script&gt;/);
  assert.doesNotMatch(render(summary, { unavailable: true }), /alert\(1\)/);
});
