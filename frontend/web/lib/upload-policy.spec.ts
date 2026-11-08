import assert from "node:assert/strict";
import { test } from "node:test";
import { getUploadMimeType, DEFAULT_UPLOAD_MIME_TYPE } from "./upload-policy";

test("missing and generic browser MIME resolves consistently from known extensions", () => {
  for (const declared of ["", undefined, null, DEFAULT_UPLOAD_MIME_TYPE]) {
    assert.equal(getUploadMimeType("Báo cáo.PDF", declared), "application/pdf");
    assert.equal(getUploadMimeType("photo.png", declared), "image/png");
    assert.equal(getUploadMimeType("image.JPEG", declared), "image/jpeg");
    assert.equal(getUploadMimeType("notes.txt", declared), "text/plain");
    assert.equal(getUploadMimeType("report.docx", declared), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  }
});

test("MIME aliases and recorder parameters normalize to a single content type", () => {
  assert.equal(getUploadMimeType("image.jpg", "image/jpg"), "image/jpeg");
  assert.equal(getUploadMimeType("report.pdf", "APPLICATION/X-PDF"), "application/pdf");
  assert.equal(getUploadMimeType("voice.webm", "audio/webm;codecs=opus"), "audio/webm");
  assert.equal(getUploadMimeType("video.mp4", " video/mp4 "), "video/mp4");
});

test("explicit mismatches are not disguised; unknown types remain generic", () => {
  assert.equal(getUploadMimeType("photo.png", "application/pdf"), "application/pdf");
  assert.equal(getUploadMimeType("unknown.binary", ""), DEFAULT_UPLOAD_MIME_TYPE);
  assert.equal(getUploadMimeType("no-extension", ""), DEFAULT_UPLOAD_MIME_TYPE);
  assert.equal(getUploadMimeType("file.constructor", ""), DEFAULT_UPLOAD_MIME_TYPE);
});
