import { test } from "node:test";
import assert from "node:assert/strict";
import { MeetingSummaryReadiness } from "./availability";

test("summary readiness checks health only and requires a live jobs worker", async () => {
  const urls: string[] = [];
  const probe = new MeetingSummaryReadiness(
    async () => "ready:meeting-v1",
    "http://speech",
    "test-key",
    async (url) => {
      urls.push(String(url));

      return new Response("ok");
    },
  );
  assert.equal(await probe.check(), true);
  assert.deepEqual(urls, ["http://speech/ready"]);
  const missingWorker = new MeetingSummaryReadiness(
    async () => null,
    "http://speech",
    "test-key",
    async () => {
      throw new Error("must not call speech");
    },
  );
  assert.equal(await missingWorker.check(), false);
});

test("speech failures are cached briefly and recover after cache expiry", async () => {
  let now = 0,
    requests = 0;
  const probe = new MeetingSummaryReadiness(
    async () => "ready:meeting-v1",
    "http://speech",
    "test-key",
    async () => {
      requests++;

      return new Response("", { status: requests === 1 ? 503 : 200 });
    },
    () => now,
  );
  assert.deepEqual(await Promise.all([probe.check(), probe.check()]), [
    false,
    false,
  ]);
  assert.equal(requests, 1);
  now = 6000;
  assert.equal(await probe.check(), true);
});
