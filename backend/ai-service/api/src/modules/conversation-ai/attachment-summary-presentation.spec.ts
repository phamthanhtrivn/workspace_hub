import assert from "node:assert/strict";
import { test } from "node:test";
import { presentAttachmentSummary } from "./attachment-summary-presentation";

void test("English output retains generated content and uses English coverage notes", () => {
  const content =
    "## Findings\n- Revenue: 42.\n- Original quote: ‘Tài liệu gốc’.";
  const result = presentAttachmentSummary(
    JSON.stringify({ language: "en", content }),
    "Báo cáo.pdf",
    { truncated: true, hasImages: true },
  );
  assert.ok(result.startsWith("Document summary: Báo cáo.pdf\n\n"));
  assert.ok(result.includes(content));
  assert.ok(result.includes("selected excerpts"));
  assert.ok(result.includes("text/OCR only"));
  assert.ok(!result.includes("Lưu ý:"));
});

void test("Vietnamese output retains generated content and uses matching headings and notes", () => {
  const content =
    "## Kết quả\n- Doanh thu: 42.\n- Giữ nguyên tên API và số liệu.";
  const result = presentAttachmentSummary(
    JSON.stringify({ language: "vi", content }),
    "English report.pdf",
    { truncated: true, hasImages: true },
  );
  assert.ok(result.startsWith("Tóm tắt tài liệu: English report.pdf\n\n"));
  assert.ok(result.includes(content));
  assert.ok(result.includes("Lưu ý: Tài liệu dài"));
  assert.ok(!result.includes("Note:"));
});

void test("full text-only summaries omit coverage notes and sanitize the file heading", () => {
  const result = presentAttachmentSummary(
    '```json\n{"language":"en","content":"The summary."}\n```',
    "[report]\n<script>.pdf",
    { truncated: false, hasImages: false },
  );
  assert.ok(result.endsWith("\n\nThe summary."));
  assert.ok(!result.includes("Note:"));
  assert.ok(!result.includes("<script>"));
});

void test("malformed or unsupported model responses never appear as a summary", () => {
  for (const raw of [
    "not JSON",
    '{"language":"en","content":""}',
    '{"language":"fr","content":"Bonjour"}',
    '{"content":"Summary without language"}',
    '{"language":"en","content":"Summary","extra":"unexpected"}',
  ]) {
    assert.throws(() =>
      presentAttachmentSummary(raw, "report.pdf", {
        truncated: false,
        hasImages: false,
      }),
    );
  }
});
