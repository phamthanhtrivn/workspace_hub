import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const imports = new Set();
const cache = new Map();
function loadSource(url) {
  if (cache.has(url.href)) return cache.get(url.href);
  const exports = {};
  cache.set(url.href, exports);
  const { outputText } = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      imports.add(name);
      assert.doesNotMatch(name, /(?:\/api\/|\/hooks\/|\/store\/|axios|react-query|livekit|fullcalendar|next\/navigation|session-provider)/, `Stateful dependency in static preview: ${name}`);
      if (!name.startsWith(".") && !name.startsWith("@/")) return require(name);
      const base = name.startsWith("@/") ? new URL(`../${name.slice(2)}`, import.meta.url) : new URL(name, url);
      const resolved = [".tsx", ".ts"].map(extension => new URL(base.href + extension)).find(existsSync);
      assert.ok(resolved, `Cannot resolve ${name}`);
      return loadSource(resolved);
    },
  });
  return exports;
}

const loadPreview = filename => loadSource(new URL(`../features/landing/components/preview/${filename}.tsx`, import.meta.url));
const { PREVIEW_FRAME_CLASS_NAME } = loadSource(new URL("../features/landing/components/preview/preview-data.ts", import.meta.url));
const CASES = [
  { id: "projects", filename: "project-preview", component: "ProjectPreview", content: ["Kanban Board", "IN REVIEW", "CANCELLED", "GRAD-10", "Create Task", "Project settings"] },
  { id: "messages", filename: "messages-preview", component: "MessagesPreview", content: ["Direct messages", "Channels", "Message #research", "Research brief.pdf", "PROJECT TASK"] },
  { id: "meetings", filename: "meetings-preview", component: "MeetingsPreview", content: ["New meeting", "Join meeting", "Schedule meeting", "View recordings", "Next meetings", "Recent meetings", "Meeting stats"] },
  { id: "documents", filename: "documents-preview", component: "DocumentsPreview", content: ["My files", "Shared", "Starred", "Trash", "Search documents and folders...", "Project timeline.xlsx"] },
  { id: "calendar", filename: "calendar-preview", component: "CalendarPreview", content: ["My Calendars", "Create event", "Week", "MON", "SUN", "GMT+7", "Oct 26"] },
  { id: "pomodoro", filename: "pomodoro-preview", component: "PomodoroPreview", content: ["Pomodoro Focus", "Short break", "Long break", "25:00", "Start focus", "Current focus", "Focus time", "Focus sounds"] },
];

for (const { id, filename, component, content } of CASES) {
  test(`${id} server-renders its representative interface as a static, readable illustration`, () => {
    const Component = loadPreview(filename)[component];
    const html = renderToStaticMarkup(createElement(Component));
    assert.ok(html.includes(`data-module-preview="${id}"`));
    assert.ok(html.includes("interface preview, sample data"));
    assert.ok(html.includes(PREVIEW_FRAME_CLASS_NAME), "Every module must keep the preview frame height stable");
    assert.ok(html.includes("font-sans"), "Inherit the application's Inter font");
    for (const label of content) assert.ok(html.includes(label), `Missing ${id} content: ${label}`);
    assert.doesNotMatch(html, /<(?:button|input|textarea|select|a|audio|video)\b|contenteditable=|draggable=|role="button"/i);
    assert.doesNotMatch(html, /opacity:\s*0|visibility:\s*hidden|style="display:\s*none/);
  });
}

test("all six illustrations stay independent of authenticated module runtimes", () => {
  for (const { filename } of CASES) loadPreview(filename);
  assert.ok(imports.has("@/components/ui/button"), "Reuse the owned UI style variants");
  assert.ok(imports.has("@/features/meeting/types/meeting.constants"));
  assert.ok(imports.has("@/features/pomodoro/constants/pomodoro-mode-theme"));
  assert.ok(imports.has("@/features/calendar/types/calendar.constants"));
});
