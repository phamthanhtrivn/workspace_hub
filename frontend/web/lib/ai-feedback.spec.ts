import assert from "node:assert/strict";
import { test } from "node:test";
import { aiErrorMessage } from "./ai-feedback";

const serviceError = (message: unknown, status = 400) => ({
  isAxiosError: true,
  response: { status, data: { message } },
});

test("legacy Vietnamese AI service feedback falls back to English", () => {
  const fallback = "Unable to request a summary. Try again.";
  for (const message of ["Tài liệu không có văn bản.", ["Mã file không hợp lệ."], null]) {
    assert.equal(aiErrorMessage(serviceError(message), fallback), fallback);
  }
});

test("English service feedback is preserved and rate limits use English guidance", () => {
  const message = "Only PDF, DOCX, TXT, and MD files up to 20 MiB can be summarized.";
  assert.equal(aiErrorMessage(serviceError(message), "Try again."), message);
  assert.equal(aiErrorMessage(serviceError("Vui lòng thử lại.", 429), "Try again."), "Too many AI requests. Wait a minute, then try again.");
});
