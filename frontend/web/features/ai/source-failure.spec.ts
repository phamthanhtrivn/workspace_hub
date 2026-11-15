import assert from "node:assert/strict";
import { test } from "node:test";
import { sourceFailure } from "./source-failure";

test("English file-limit errors do not offer an ineffective retry", () => {
  for (const message of [
    "The PDF exceeds 100 pages. Split it into smaller files before uploading.",
    "The DOCX exceeds 100 MiB after decompression. Reduce its images or split the file.",
    "The file exceeds 24 pages/images requiring Vision or 16 MiB of extracted images. Split it into smaller files.",
    "The source exceeds 100,000 tokens.",
  ]) {
    const failure = sourceFailure(message);
    assert.equal(failure.canRetry, false);
    assert.match(failure.message, /Split|split/);
  }
});

test("legacy source errors remain readable in English and transient failures stay retryable", () => {
  const legacy = sourceFailure("PDF v\u01b0\u1ee3t 100 trang");
  assert.equal(legacy.canRetry, false);
  assert.match(legacy.message, /^This PDF exceeds 100 pages/);
  assert.equal(
    sourceFailure("The RAG worker is unavailable or timed out.").canRetry,
    true,
  );
});
