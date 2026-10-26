import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url);
function loadFile(relative) {
  const exports = {};
  const source = readFileSync(
    new URL(relative, import.meta.url),
    "utf8",
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    { exports, require: (name) => {
      if (name === "@/components/ui/table") return loadFile("../components/ui/table.tsx");
      if (name === "@/lib/utils") return loadFile("../lib/utils.ts");
      return require(name);
    } },
  );
  return exports;
}
const loadUtility = name => loadFile("../features/chat/utils/" + name);
const { getChannelMentionOptions, getCachedMentionOptions } = loadUtility(
  "mention-member-utils.ts",
);
const { renderMessageContent } = loadUtility("message-formatter.tsx");

test("channel AI suggestion is available even without other members and is searchable", () => {
  assert.equal(
    getChannelMentionOptions(undefined, "self", { searchQuery: "AI" })[0].name,
    "ai",
  );
  assert.equal(
    getChannelMentionOptions(undefined, "self", { searchQuery: "unrelated" })
      .length,
    0,
  );
});

test("direct AI suggestion does not require a bot user or cached profile", () => {
  const result = getCachedMentionOptions(undefined, {}, "ai", "self");
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "ai");
  assert.equal(result[0].name, "ai");
});

test("AI suggestions obey the result limit and exclude the current user", () => {
  const result = getCachedMentionOptions(
    [
      { userId: "self" },
      { userId: "one", nickname: "Alice" },
      { userId: "two", nickname: "Aimee" },
    ],
    {},
    "ai",
    "self",
    2,
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].id, "ai");
  assert.ok(result.every((member) => member.id !== "self"));
});

test("chat rendering escapes model HTML while preserving Vietnamese and formatting", () => {
  const html = renderToStaticMarkup(
    createElement(
      "div",
      null,
      renderMessageContent(
        "**Ngủ ngon**\n<script>alert(1)</script> <img src=x onerror=alert(2)>",
      ),
    ),
  );
  assert.match(html, /<strong[^>]*>Ngủ ngon<\/strong>/);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
  assert.match(html, /&lt;script&gt;/);
});


test("task markdown becomes a styled, accessible table with all rows", () => {
  const content = "Hôm nay **24/10/2026**\n\n| Công việc | Dự án | Hạn chót |\n|---|---|---|\n| Finish dashboard cards | [DEMO] Dashboard release | 05/10/2026 |\n| Write release checklist | [DEMO] Mobile workspace | 07/10/2026 |\n\nKhông có công việc đến hạn hôm nay.";
  const html = renderToStaticMarkup(renderMessageContent(content));
  assert.match(html, /<table /);
  assert.match(html, /<thead /);
  assert.equal((html.match(/scope="col"/g) || []).length, 3);
  assert.equal((html.match(/<td /g) || []).length, 6);
  assert.match(html, /overflow-x-auto/);
  assert.match(html, /aria-label="Bảng trong tin nhắn"/);
  assert.match(html, /Finish dashboard cards/);
  assert.match(html, /Không có công việc đến hạn hôm nay/);
  assert.ok(!html.includes("|---|"));
});
test("table cells preserve emphasis, escaped pipes, links and column alignment safely", () => {
  const html = renderToStaticMarkup(renderMessageContent("Task | Date\n:--- | ---:\n**A** \\| B | [Open](https://example.test)\n<script>alert(1)</script> | ![Image](https://example.test/tracker.png)"));
  assert.match(html, /<strong>A<\/strong> \| B/);
  assert.match(html, /text-align:right/);
  assert.match(html, /href="https:\/\/example.test"/);
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("<img"));
});
test("ordinary pipes and fenced table examples remain text/code", () => {
  for (const content of ["A | B\nordinary text", "```txt\n| A | B |\n|---|---|\n| 1 | 2 |\n``` "]) {
    const html = renderToStaticMarkup(renderMessageContent(content));
    assert.ok(!html.includes("<table"));
  }
});
