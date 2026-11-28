import assert from "node:assert/strict";
import { test } from "node:test";
import { api } from "@/lib/axios";
import { getPresignedUrls, uploadToS3 } from "./media.api";
import { ChatContextType } from "../types/chat.types";

test("presign and S3 PUT use the same normalized MIME for a file with an empty browser type", async (context) => {
  const originalAdapter = api.defaults.adapter;
  context.after(() => { api.defaults.adapter = originalAdapter; });
  const file = new File(["%PDF-1.7"], "report.pdf", { type: "" });
  api.defaults.adapter = async (config) => {
    const body = JSON.parse(config.data);
    assert.equal(body.files[0].mimeType, "application/pdf");
    assert.equal(body.files[0].fileName, file.name);
    assert.equal(body.files[0].sizeBytes, file.size);
    return { status: 200, statusText: "OK", headers: {}, config, data: { data: [{ ...body.files[0], s3Key: "chat/test/report.pdf", presignedUrl: "https://upload.example.test/file" }] } };
  };
  const fetch = context.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, request?: RequestInit) => {
    assert.equal((request?.headers as Record<string, string>)["Content-Type"], "application/pdf");
    assert.equal(request?.body, file);
    return new Response(null, { status: 200 });
  });
  const [presigned] = await getPresignedUrls({ chatId: "channel", chatType: ChatContextType.CHANNEL, files: [{ fileName: file.name, mimeType: file.type, sizeBytes: file.size }] });
  assert.equal(await uploadToS3(file, presigned.presignedUrl), true);
  assert.equal(fetch.mock.callCount(), 1);
});
