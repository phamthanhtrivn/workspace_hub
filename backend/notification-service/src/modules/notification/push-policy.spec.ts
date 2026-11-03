import { test } from "node:test";
import * as assert from "node:assert/strict";
import { assertPushEndpoint, withPushSlot, PUSH_POLICY } from "./push-policy";

test("push endpoint requires an explicit host, HTTPS, standard port and no embedded credentials", () => {
  const previous = process.env.WEB_PUSH_ALLOWED_HOSTS;
  try {
    delete process.env.WEB_PUSH_ALLOWED_HOSTS;
    assert.throws(() => assertPushEndpoint("https://push.example.test/send"));
    process.env.WEB_PUSH_ALLOWED_HOSTS = "push.example.test";
    assert.equal(
      assertPushEndpoint("https://push.example.test/send").hostname,
      "push.example.test",
    );
    for (const url of [
      "http://push.example.test/send",
      "https://push.example.test:8443/send",
      "https://user:pass@push.example.test/send",
      "https://127.0.0.1/send",
      "https://push.example.test.evil.test/send",
    ])
      assert.throws(() => assertPushEndpoint(url));
  } finally {
    if (previous === undefined) delete process.env.WEB_PUSH_ALLOWED_HOSTS;
    else process.env.WEB_PUSH_ALLOWED_HOSTS = previous;
  }
});

test("push delivery never exceeds the configured global concurrency", async () => {
  let running = 0,
    maximum = 0;
  await Promise.all(
    Array.from({ length: 20 }, () =>
      withPushSlot(async () => {
        running++;
        maximum = Math.max(maximum, running);
        await new Promise((resolve) => setTimeout(resolve, 1));
        running--;
      }),
    ),
  );
  assert.equal(maximum, PUSH_POLICY.concurrency);
  assert.equal(running, 0);
});
