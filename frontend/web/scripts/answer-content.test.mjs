import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loadComponent(name, mocks = {}, globals = {}) {
  const exports = {};
  const source = readFileSync(
    new URL(`../features/ai/components/${name}.tsx`, import.meta.url),
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
    { exports, require: (name) => mocks[name] ?? require(name), ...globals },
  );
  return exports;
}
const { AnswerContent } = loadComponent("answer-content");
const renderAnswer = (content, props = {}) =>
  renderToStaticMarkup(createElement(AnswerContent, { content, ...props }));

test("renders headings, bold text and separate list items from the reported answer", () => {
  const html = renderAnswer(
    "## Nội dung cần ôn\n\nTheo tài liệu:\n\n- **Function Point (FP)**: cách tính tổng [[S5]].\n- **Độ đo lỗi**: DD = tổng số lỗi / KLOC.",
  );
  assert.match(html, /<h2>Nội dung cần ôn<\/h2>/);
  assert.match(html, /<strong>Function Point \(FP\)<\/strong>/);
  assert.equal((html.match(/<li>/g) || []).length, 2);
  assert.match(html, /<ul>/);
  assert.ok(!html.includes("**"));
});

test("renders citations inside emphasis and tables while retaining unknown source markers", () => {
  const html = renderAnswer(
    "**Ý chính [[S1]]**\n\n| Chủ đề | Nguồn |\n| --- | --- |\n| FP | [[S2]] |\n\nChưa có [[S99]].",
    {
      renderCitation: (label) =>
        ["S1", "S2"].includes(label)
          ? createElement(
              "button",
              { "aria-label": `Nguồn ${label}` },
              label.slice(1),
            )
          : undefined,
    },
  );
  assert.match(
    html,
    /<strong>Ý chính <button aria-label="Nguồn S1">1<\/button><\/strong>/,
  );
  assert.match(html, /<table/);
  assert.match(html, /<td><button aria-label="Nguồn S2">2<\/button><\/td>/);
  assert.match(html, /\[\[S99\]\]/);
});

test("does not turn source-like text inside code or links into citation buttons", () => {
  const html = renderAnswer(
    "`[[S1]]`\n\n```txt\n[[S2]]\n```\n\n[Text [[S3]]](https://example.com)",
    {
      renderCitation: () => createElement("button", null, "unexpected"),
    },
  );
  assert.ok(!html.includes("<button"));
  assert.match(html, /<code>\[\[S1\]\]<\/code>/);
  assert.match(html, /\[\[S2\]\]/);
  assert.match(html, /\[\[S3\]\]/);
});

test("ignores raw HTML, blocks unsafe links and avoids loading remote images", () => {
  const html = renderAnswer(
    "<script>alert(1)</script>\n\n[Unsafe](javascript:alert%281%29)\n\n![Ảnh](https://example.com/tracker.png)\n\n[Safe](https://example.com)",
  );
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("javascript:"));
  assert.ok(!html.includes("<img"));
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /href="https:\/\/example.com"/);
});

const citation = {
  id: "c1",
  label: "S1",
  name: "Bài giảng",
  page: 2,
  position: 0,
  text: "Nội dung",
  sourceId: "source1",
};
const mocks = {
  "./answer-content": { AnswerContent },
  "../api/notebooks.api": { notebooksApi: {} },
};
const { Citations } = loadComponent("citations", mocks);

test("completed answers retain citation badges and original source details", () => {
  const html = renderToStaticMarkup(
    createElement(Citations, {
      notebookId: "n1",
      items: [citation],
      content: "- **Ý chính** [[S1]]",
    }),
  );
  assert.match(html, /<strong>Ý chính<\/strong>/);
  assert.match(html, /aria-label="Nguồn S1: Bài giảng, trang 2"/);
  assert.match(html, /<details/);
  assert.match(html, /Nguồn tham khảo/);
});

test("user messages preserve literal Markdown and line breaks", () => {
  const html = renderToStaticMarkup(
    createElement(Citations, {
      notebookId: "n1",
      items: [],
      content: "**Giữ nguyên**\n[[S1]]",
      markdown: false,
    }),
  );
  assert.match(html, /\*\*Giữ nguyên\*\*\n\[\[S1\]\]/);
  assert.ok(!html.includes("<strong>"));
});

test("visual citations expose an explicit image preview without loading document images automatically", () => {
  const html = renderToStaticMarkup(
    createElement(Citations, {
      notebookId: "n1",
      items: [{ ...citation, imageId: "a".repeat(64) }],
      content: "Biểu đồ [[S1]]",
    }),
  );
  assert.match(html, /Xem hình trích xuất/);
  assert.ok(!html.includes("<img"));
});

test("clicking a citation still opens and focuses its source excerpt", () => {
  let renderCitation;
  let scrolled = false;
  let focused = false;
  const details = {
    open: false,
    scrollIntoView: () => {
      scrolled = true;
    },
    querySelector: () => ({
      focus: () => {
        focused = true;
      },
    }),
  };
  const { Citations: InteractiveCitations } = loadComponent(
    "citations",
    {
      ...mocks,
      "./answer-content": {
        AnswerContent: (props) => {
          renderCitation = props.renderCitation;
          return null;
        },
      },
    },
    { document: { getElementById: () => details } },
  );
  renderToStaticMarkup(
    createElement(InteractiveCitations, {
      notebookId: "n1",
      items: [citation],
      content: "Ý chính [[S1]]",
    }),
  );
  renderCitation("S1").props.onClick();
  assert.equal(details.open, true);
  assert.equal(scrolled, true);
  assert.equal(focused, true);
});
