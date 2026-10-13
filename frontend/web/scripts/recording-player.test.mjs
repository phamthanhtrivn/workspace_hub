import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function renderPlayer(query) {
  const source = readFileSync(
    new URL("../features/meeting/components/recordings/meeting-recording-player.tsx", import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const modules = {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "@tanstack/react-query": { useQuery: () => query },
    "@/store/store": {
      useAppSelector: (select) => select({ auth: { userId: "viewer" } }),
    },
    "@/components/ui/dialog": {
      Dialog: ({ children }) => React.createElement("div", null, children),
      DialogContent: ({ children }) => React.createElement("div", null, children),
      DialogTitle: ({ children }) => React.createElement("h2", null, children),
    },
    "../../api/meeting-recording.api": { recordingApi: {} },
    "../ui/meeting-form-controls": {
      MeetingButton: ({ children }) => React.createElement("button", null, children),
    },
  };
  const compiled = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: compiled.exports,
    module: compiled,
    require(name) {
      assert.ok(name in modules, "Unexpected player dependency " + name);
      return modules[name];
    },
  });
  return renderToStaticMarkup(
    React.createElement(compiled.exports.MeetingRecordingPlayer, {
      recording: { id: "recording", title: "Meeting video" },
      onClose() {},
    }),
  );
}

test("a failed URL refresh retains the playable cached video", () => {
  const markup = renderPlayer({
    data: { url: "/recording.mp4", expiresAt: "2026-10-13T12:00:00Z" },
    isError: true,
    isLoading: false,
  });
  assert.match(markup, /<video/);
  assert.match(markup, /src="\/recording.mp4"/);
  assert.doesNotMatch(markup, /Recording unavailable/);
});

test("an initial access failure displays an error and retry button", () => {
  const markup = renderPlayer({ isError: true, isLoading: false });
  assert.doesNotMatch(markup, /<video/);
  assert.match(markup, /Recording unavailable or access has been revoked/);
  assert.match(markup, /Try again/);
});
