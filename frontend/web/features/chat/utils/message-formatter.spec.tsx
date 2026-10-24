import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMessageContent } from "./message-formatter";
import { composeMessageText } from "./message-draft";

test("code blocks retain indentation and trailing newlines without formatting their contents", () => {
  const code = "  model DirectMessage {\n    id String\n  }\n\n";
  const html = renderToStaticMarkup(
    renderMessageContent("```prisma\n" + code + "```"),
  );
  assert.ok(html.includes(`<code>${code}</code>`));
  assert.ok(html.includes('aria-label="Copy code"'));
});

test("each fenced code block gets a separate Copy action and supports CRLF and language names", () => {
  const html = renderToStaticMarkup(
    renderMessageContent(
      "```c++\r\n  first();\r\n```\nText\n```ts\nsecond();\n```",
    ),
  );
  assert.equal((html.match(/aria-label="Copy code"/g) || []).length, 2);
  assert.ok(html.includes("  first();\r\n</code>"));
  assert.ok(html.includes("second();\n</code>"));
});

test("regular rich text, mentions and links still render around code blocks", () => {
  const html = renderToStaticMarkup(
    renderMessageContent(
      "**Bold** @Tri Pham\n[Docs](https://example.com)\n```\n**literal** @All\n```",
      {
        user: {
          userId: "user",
          fullName: "Tri Pham",
          email: null,
          avatarUrl: null,
        },
      },
    ),
  );
  assert.match(html, /<strong[^>]*>Bold<\/strong>/);
  assert.ok(html.includes('href="https://example.com"'));
  assert.match(html, /<span[^>]*>@Tri Pham<\/span>/);
  assert.ok(html.includes("<code>**literal** @All\n</code>"));
});

test("preview and Send use the same normalized draft while preserving code whitespace", () => {
  const draft = "  ```ts\n  const value = 1;\n```  ";
  assert.equal(composeMessageText(draft), "```ts\n  const value = 1;\n```");
  assert.equal(
    composeMessageText("  **Draft**  ", " spoken text  "),
    "**Draft** spoken text",
  );
  assert.equal(composeMessageText("", " spoken text "), "spoken text");
  assert.equal(composeMessageText("   ", "   "), "");
});
